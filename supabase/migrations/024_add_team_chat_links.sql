-- Добавляем поля для ссылок на чаты команд
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_chat_link TEXT;

-- Добавляем комментарии
COMMENT ON COLUMN users.team_chat_link IS 'Ссылка на чат команды для аналитики';

-- Создаем индекс для быстрого поиска по Team Lead
CREATE INDEX IF NOT EXISTS idx_users_team_lead_id ON users(team_lead_id) WHERE team_lead_id IS NOT NULL;
