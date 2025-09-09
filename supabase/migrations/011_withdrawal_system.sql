-- Миграция для добавления системы выводов в тестовые работы
-- Добавляет поля для управления выводами

-- Добавляем поля для системы выводов
ALTER TABLE casino_tests 
ADD COLUMN IF NOT EXISTS withdrawal_status VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS withdrawal_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS withdrawal_notes TEXT DEFAULT NULL;

-- Создаем enum для статусов выводов (если нужно)
DO $$ BEGIN
    CREATE TYPE withdrawal_status_enum AS ENUM ('new', 'waiting', 'received', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Обновляем тип колонки (опционально)
-- ALTER TABLE casino_tests ALTER COLUMN withdrawal_status TYPE withdrawal_status_enum USING withdrawal_status::withdrawal_status_enum;

-- Добавляем комментарии к полям
COMMENT ON COLUMN casino_tests.withdrawal_status IS 'Статус вывода: new, waiting, received, blocked';
COMMENT ON COLUMN casino_tests.withdrawal_requested_at IS 'Время создания запроса на вывод';
COMMENT ON COLUMN casino_tests.withdrawal_notes IS 'Заметки к выводу';

-- Проверяем что поля добавлены
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'casino_tests' 
  AND column_name IN ('withdrawal_status', 'withdrawal_requested_at', 'withdrawal_notes')
ORDER BY column_name;
