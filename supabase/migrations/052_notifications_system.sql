-- Создание системы уведомлений
-- Дата: 12 сентября 2025

-- Типы уведомлений
CREATE TYPE notification_type AS ENUM (
    'bank_assignment',      -- Назначение банка
    'card_assignment',      -- Назначение карты
    'card_issued',          -- Выпуск новой карты
    'withdrawal_pending',   -- Новый вывод на проверку
    'withdrawal_approved',  -- Вывод одобрен
    'withdrawal_blocked',   -- Вывод заблокирован
    'account_blocked',      -- Аккаунт заблокирован
    'casino_assignment',    -- Назначение казино
    'task_assigned',        -- Назначена задача
    'task_completed',       -- Задача выполнена
    'system_alert'          -- Системное уведомление
);

-- Приоритеты уведомлений
CREATE TYPE notification_priority AS ENUM (
    'low',      -- Низкий приоритет
    'normal',   -- Обычный приоритет
    'high',     -- Высокий приоритет
    'urgent'    -- Критический приоритет
);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Получатель уведомления
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Отправитель (может быть NULL для системных уведомлений)
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Тип и приоритет
    type notification_type NOT NULL,
    priority notification_priority DEFAULT 'normal',
    
    -- Содержание уведомления
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Дополнительные данные (JSON)
    metadata JSONB DEFAULT '{}',
    
    -- Ссылка для перехода
    action_url VARCHAR(500),
    
    -- Статус уведомления
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Настройки отображения
    show_sound BOOLEAN DEFAULT TRUE,
    show_popup BOOLEAN DEFAULT TRUE,
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Составной индекс для быстрого поиска непрочитанных уведомлений пользователя
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = FALSE;

-- Триггер для обновления времени прочтения
CREATE OR REPLACE FUNCTION update_notification_read_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_read_time
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_read_time();

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политики RLS
-- Пользователи видят только свои уведомления
CREATE POLICY "notifications_own_access" ON notifications
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users 
            WHERE auth_id = auth.uid()
        )
    );

-- Admin видит все уведомления
CREATE POLICY "notifications_admin_access" ON notifications
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role = 'admin' 
            AND status = 'active'
        )
    );

-- HR может видеть уведомления всех пользователей (для мониторинга)
CREATE POLICY "notifications_hr_view" ON notifications
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role = 'hr' 
            AND status = 'active'
        )
    );

-- Функция для создания уведомления
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title VARCHAR(255),
    p_message TEXT,
    p_sender_id UUID DEFAULT NULL,
    p_priority notification_priority DEFAULT 'normal',
    p_metadata JSONB DEFAULT '{}',
    p_action_url VARCHAR(500) DEFAULT NULL,
    p_show_sound BOOLEAN DEFAULT TRUE,
    p_show_popup BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, sender_id, type, title, message, 
        priority, metadata, action_url, show_sound, show_popup
    ) VALUES (
        p_user_id, p_sender_id, p_type, p_title, p_message,
        p_priority, p_metadata, p_action_url, p_show_sound, p_show_popup
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для массового создания уведомлений
CREATE OR REPLACE FUNCTION create_bulk_notifications(
    p_user_ids UUID[],
    p_type notification_type,
    p_title VARCHAR(255),
    p_message TEXT,
    p_sender_id UUID DEFAULT NULL,
    p_priority notification_priority DEFAULT 'normal',
    p_metadata JSONB DEFAULT '{}',
    p_action_url VARCHAR(500) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    user_id UUID;
    count INTEGER := 0;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        PERFORM create_notification(
            user_id, p_type, p_title, p_message,
            p_sender_id, p_priority, p_metadata, p_action_url
        );
        count := count + 1;
    END LOOP;
    
    RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения количества непрочитанных уведомлений
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications 
        WHERE user_id = p_user_id 
        AND is_read = FALSE 
        AND expires_at > CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Функция для пометки уведомлений как прочитанных
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Отметить все непрочитанные уведомления пользователя
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE user_id = p_user_id 
        AND is_read = FALSE;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSE
        -- Отметить конкретные уведомления
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE user_id = p_user_id 
        AND id = ANY(p_notification_ids)
        AND is_read = FALSE;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    END IF;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для очистки старых уведомлений
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Комментарии к таблице и столбцам
COMMENT ON TABLE notifications IS 'Система уведомлений для всех пользователей';
COMMENT ON COLUMN notifications.user_id IS 'Получатель уведомления';
COMMENT ON COLUMN notifications.sender_id IS 'Отправитель уведомления (NULL для системных)';
COMMENT ON COLUMN notifications.type IS 'Тип уведомления';
COMMENT ON COLUMN notifications.priority IS 'Приоритет уведомления';
COMMENT ON COLUMN notifications.title IS 'Заголовок уведомления';
COMMENT ON COLUMN notifications.message IS 'Текст уведомления';
COMMENT ON COLUMN notifications.metadata IS 'Дополнительные данные в JSON формате';
COMMENT ON COLUMN notifications.action_url IS 'URL для перехода при клике на уведомление';
COMMENT ON COLUMN notifications.is_read IS 'Прочитано ли уведомление';
COMMENT ON COLUMN notifications.show_sound IS 'Воспроизводить ли звук';
COMMENT ON COLUMN notifications.show_popup IS 'Показывать ли всплывающее окно';
COMMENT ON COLUMN notifications.expires_at IS 'Время истечения уведомления';

-- Создание тестовых уведомлений для разработки
DO $$
DECLARE
    admin_user_id UUID;
    junior_user_id UUID;
BEGIN
    -- Получаем ID админа и junior для тестов
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO junior_user_id FROM users WHERE role = 'junior' LIMIT 1;
    
    -- Создаем тестовые уведомления только если пользователи найдены
    IF admin_user_id IS NOT NULL AND junior_user_id IS NOT NULL THEN
        -- Системное уведомление
        PERFORM create_notification(
            admin_user_id,
            'system_alert',
            'Система уведомлений активна',
            'Система уведомлений успешно настроена и готова к работе.',
            NULL,
            'normal',
            '{"version": "1.0", "feature": "notifications"}',
            '/dashboard/admin'
        );
        
        -- Уведомление о назначении
        PERFORM create_notification(
            junior_user_id,
            'card_assignment',
            'Назначена новая карта',
            'Вам назначена новая банковская карта для работы.',
            admin_user_id,
            'high',
            '{"card_id": "test-card-123"}',
            '/dashboard/junior/cards'
        );
    END IF;
END $$;
