-- Миграция 013: Добавление роли Team Lead и иерархии

-- Добавляем роль teamlead в enum user_role
ALTER TYPE user_role ADD VALUE 'teamlead';

-- Добавляем поле team_lead_id в таблицу users для иерархии
ALTER TABLE users ADD COLUMN team_lead_id UUID REFERENCES users(id);

-- Создаем индекс для быстрого поиска подчиненных
CREATE INDEX idx_users_team_lead_id ON users(team_lead_id);

-- Комментарии
COMMENT ON COLUMN users.team_lead_id IS 'ID Team Lead которому подчиняется junior';

-- Обновляем middleware для новой роли
UPDATE users SET role = 'teamlead' WHERE email = 'teamlead@example.com'; -- Пример

-- Проверяем что роль добавлена
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

-- Показываем структуру таблицы users
\d users;
