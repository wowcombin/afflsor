-- Исправление RLS политики для создания пользователей
-- Добавляем роль 'manager' в политику INSERT для таблицы users

-- Удаляем старую политику
DROP POLICY IF EXISTS "HR и Admin могут создавать пользователей" ON users;

-- Создаем новую политику с ролью manager
CREATE POLICY "HR, Manager и Admin могут создавать пользователей" ON users
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

-- Также обновляем политику UPDATE для консистентности
DROP POLICY IF EXISTS "HR и Admin могут изменять пользователей" ON users;

CREATE POLICY "HR, Manager и Admin могут изменять пользователей" ON users
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

-- Обновляем политику SELECT для консистентности  
DROP POLICY IF EXISTS "HR и Admin могут видеть всех пользователей" ON users;

CREATE POLICY "HR, Manager и Admin могут видеть всех пользователей" ON users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );
