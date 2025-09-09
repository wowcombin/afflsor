-- Миграция 001: Базовая схема ERP системы v2.0

-- Создаем типы (enums)
CREATE TYPE user_role AS ENUM ('junior', 'manager', 'tester', 'hr', 'cfo', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'terminated');

-- Таблица пользователей
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL, -- Связь с auth.users
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role NOT NULL,
  status user_status DEFAULT 'active',
  telegram_username VARCHAR(100),
  usdt_wallet VARCHAR(100),
  salary_percentage NUMERIC(5,2) DEFAULT 0.00, -- Процент от профита
  salary_bonus NUMERIC(10,2) DEFAULT 0.00, -- Фиксированный бонус
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики RLS для таблицы users
CREATE POLICY "Пользователи могут видеть свои данные" ON users
    FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "HR и Admin могут видеть всех пользователей" ON users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "HR и Admin могут изменять пользователей" ON users
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "HR и Admin могут создавать пользователей" ON users
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin') AND status = 'active'
        )
    );

-- Комментарии к таблице
COMMENT ON TABLE users IS 'Пользователи ERP системы';
COMMENT ON COLUMN users.auth_id IS 'ID из auth.users таблицы Supabase';
COMMENT ON COLUMN users.salary_percentage IS 'Процент от профита (например, 15.50 = 15.5%)';
COMMENT ON COLUMN users.salary_bonus IS 'Фиксированный бонус в USD';
