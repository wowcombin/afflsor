-- Исправление дублирующихся RLS политик для таблицы users
-- Удаляем все существующие политики и создаем правильные

-- Удаляем все возможные варианты политик
DROP POLICY IF EXISTS "HR и Admin могут создавать пользователей" ON users;
DROP POLICY IF EXISTS "HR, Manager и Admin могут создавать пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут создавать пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут создавать пользова" ON users;

DROP POLICY IF EXISTS "HR и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR, Manager и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут изменять пользователей" ON users;

DROP POLICY IF EXISTS "HR и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR, Manager и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут видеть всех пользователей" ON users;

-- Создаем финальные корректные политики
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

CREATE POLICY "users_select_all_policy" ON users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

-- Политика для просмотра собственных данных остается без изменений
-- CREATE POLICY "Пользователи могут видеть свои данные" ON users
--     FOR SELECT USING (auth_id = auth.uid());

-- Комментарии для ясности
COMMENT ON POLICY "users_insert_policy" ON users IS 'HR, Manager и Admin могут создавать пользователей';
COMMENT ON POLICY "users_update_policy" ON users IS 'HR, Manager и Admin могут изменять пользователей';
COMMENT ON POLICY "users_select_all_policy" ON users IS 'HR, Manager и Admin могут видеть всех пользователей';
