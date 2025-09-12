-- Миграция 044: Добавление системы управления сессиями
-- Добавляем поля для управления сессиями пользователей

-- Добавляем поля в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 15;

-- Обновляем существующих пользователей
UPDATE users 
SET max_concurrent_sessions = 1, 
    session_timeout_minutes = 15 
WHERE max_concurrent_sessions IS NULL OR session_timeout_minutes IS NULL;

-- Создаем таблицу сессий если её нет
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terminated_reason VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Функция создания сессии с контролем лимита
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_token VARCHAR(255),
    p_ip INET,
    p_user_agent TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_max_sessions INTEGER;
    v_timeout_minutes INTEGER;
    v_active_count INTEGER;
BEGIN
    -- Получаем настройки пользователя
    SELECT max_concurrent_sessions, session_timeout_minutes 
    INTO v_max_sessions, v_timeout_minutes
    FROM users WHERE id = p_user_id;
    
    -- Закрываем истекшие сессии
    UPDATE user_sessions
    SET is_active = FALSE,
        terminated_reason = 'timeout'
    WHERE user_id = p_user_id
        AND is_active = TRUE
        AND expires_at < NOW();
    
    -- Считаем активные сессии
    SELECT COUNT(*) INTO v_active_count
    FROM user_sessions
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Если превышен лимит, закрываем старейшие сессии
    WHILE v_active_count >= v_max_sessions LOOP
        UPDATE user_sessions
        SET is_active = FALSE,
            terminated_reason = 'max_sessions_reached'
        WHERE id = (
            SELECT id FROM user_sessions
            WHERE user_id = p_user_id AND is_active = TRUE
            ORDER BY last_heartbeat ASC
            LIMIT 1
        );
        
        v_active_count := v_active_count - 1;
    END LOOP;
    
    -- Создаем новую сессию
    INSERT INTO user_sessions(user_id, token, ip_address, user_agent, expires_at)
    VALUES (
        p_user_id, 
        p_token, 
        p_ip, 
        p_user_agent,
        NOW() + (v_timeout_minutes || ' minutes')::INTERVAL
    )
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$;

-- Функция обновления heartbeat сессии
CREATE OR REPLACE FUNCTION update_session_heartbeat(
    p_token VARCHAR(255)
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timeout_minutes INTEGER;
    v_user_id UUID;
BEGIN
    -- Получаем user_id и timeout из сессии
    SELECT user_id INTO v_user_id
    FROM user_sessions 
    WHERE token = p_token AND is_active = TRUE;
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Получаем timeout пользователя
    SELECT session_timeout_minutes INTO v_timeout_minutes
    FROM users WHERE id = v_user_id;
    
    -- Обновляем heartbeat и продлеваем сессию
    UPDATE user_sessions
    SET last_heartbeat = NOW(),
        expires_at = NOW() + (v_timeout_minutes || ' minutes')::INTERVAL
    WHERE token = p_token AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$;

-- Функция завершения сессии
CREATE OR REPLACE FUNCTION terminate_session(
    p_token VARCHAR(255),
    p_reason VARCHAR(50) DEFAULT 'logout'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_sessions
    SET is_active = FALSE,
        terminated_reason = p_reason
    WHERE token = p_token AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$;

-- RLS политики для таблицы сессий
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои сессии
CREATE POLICY "users_own_sessions" ON user_sessions
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Админы могут видеть все сессии
CREATE POLICY "admin_all_sessions" ON user_sessions
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role = 'admin' AND status = 'active'
        )
    );

-- Комментарий к миграции
COMMENT ON TABLE user_sessions IS 'Таблица активных пользовательских сессий с контролем лимита';
COMMENT ON FUNCTION create_user_session IS 'Создание новой сессии с автоматическим контролем лимита';
COMMENT ON FUNCTION update_session_heartbeat IS 'Обновление heartbeat сессии для продления времени жизни';
COMMENT ON FUNCTION terminate_session IS 'Принудительное завершение сессии';
