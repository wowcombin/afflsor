-- Добавление новых ролей в enum (должно быть в отдельной транзакции)
-- Дата: 2024-01-XX

-- 1. Добавляем новые роли в enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'qa_assistant';

-- Комментарии к новым ролям
COMMENT ON TYPE user_role IS 'Роли пользователей в системе: junior, manager, teamlead, tester, hr, cfo, admin, ceo, qa_assistant';
