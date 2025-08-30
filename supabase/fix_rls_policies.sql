-- Исправление RLS политик для таблицы users

-- Удаляем старые политики
DROP POLICY IF EXISTS "Пользователи могут видеть свои данные" ON users;
DROP POLICY IF EXISTS "HR и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR и Admin могут создавать пользователей" ON users;

-- Временно отключаем RLS для отладки
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Или создаем более простые политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть свои данные
CREATE POLICY "users_select_own" ON users
    FOR SELECT 
    USING (auth_id = auth.uid());

-- Политика: HR и Admin могут видеть всех
CREATE POLICY "users_select_hr_admin" ON users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_id = auth.uid() 
              AND u.role IN ('hr', 'admin') 
              AND u.status = 'active'
        )
    );

-- Политика: HR и Admin могут изменять
CREATE POLICY "users_update_hr_admin" ON users
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_id = auth.uid() 
              AND u.role IN ('hr', 'admin') 
              AND u.status = 'active'
        )
    );

-- Политика: HR и Admin могут создавать
CREATE POLICY "users_insert_hr_admin" ON users
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_id = auth.uid() 
              AND u.role IN ('hr', 'admin') 
              AND u.status = 'active'
        )
    );

-- Проверяем политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Тестируем доступ (замените на реальный auth_id)
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"sub": "8a781045-d00a-4482-817d-e904c65e5cff"}';

SELECT 'Test query as authenticated user' as test;
SELECT id, email, role, status FROM users WHERE auth_id = '8a781045-d00a-4482-817d-e904c65e5cff';
