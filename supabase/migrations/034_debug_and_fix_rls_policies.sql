-- Диагностика и исправление RLS политик для таблицы users
-- Этот скрипт безопасно проверяет и исправляет политики

-- 1. ДИАГНОСТИКА: Показать все существующие политики для таблицы users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 2. ПРОВЕРКА: Показать статус RLS для таблицы users
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- 3. ИСПРАВЛЕНИЕ: Удаляем ВСЕ политики и создаем заново
-- Удаляем все возможные варианты политик (включая новые)
DROP POLICY IF EXISTS "HR и Admin могут создавать пользователей" ON users;
DROP POLICY IF EXISTS "HR, Manager и Admin могут создавать пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут создавать пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут создавать пользова" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;

DROP POLICY IF EXISTS "HR и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR, Manager и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

DROP POLICY IF EXISTS "HR и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR, Manager и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR Manager Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "users_select_all_policy" ON users;

-- Оставляем политику для просмотра собственных данных
-- DROP POLICY IF EXISTS "Пользователи могут видеть свои данные" ON users;

-- 4. СОЗДАНИЕ НОВЫХ ПОЛИТИК
-- Создаем политику для INSERT (создание пользователей)
CREATE POLICY "users_insert_policy_v2" ON users
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

-- Создаем политику для UPDATE (изменение пользователей)
CREATE POLICY "users_update_policy_v2" ON users
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

-- Создаем политику для SELECT (просмотр всех пользователей)
CREATE POLICY "users_select_all_policy_v2" ON users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'manager') AND status = 'active'
        )
    );

-- Убеждаемся, что RLS включен
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. ФИНАЛЬНАЯ ПРОВЕРКА: Показать все политики после исправления
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 6. КОММЕНТАРИИ для ясности
COMMENT ON POLICY "users_insert_policy_v2" ON users IS 'HR, Manager и Admin могут создавать пользователей (версия 2)';
COMMENT ON POLICY "users_update_policy_v2" ON users IS 'HR, Manager и Admin могут изменять пользователей (версия 2)';
COMMENT ON POLICY "users_select_all_policy_v2" ON users IS 'HR, Manager и Admin могут видеть всех пользователей (версия 2)';

-- 7. ТЕСТ: Попробуем создать тестового пользователя (закомментировано для безопасности)
-- Раскомментируйте следующие строки только для тестирования:
/*
INSERT INTO users (
    auth_id, 
    email, 
    first_name, 
    last_name, 
    role, 
    status
) VALUES (
    'test-' || extract(epoch from now())::text,
    'test-' || extract(epoch from now())::text || '@example.com',
    'Test',
    'User',
    'junior',
    'active'
);
-- Удалим тестовую запись
DELETE FROM users WHERE email LIKE 'test-%@example.com';
*/
