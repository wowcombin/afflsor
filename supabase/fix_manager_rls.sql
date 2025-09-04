-- Исправление RLS политик для роли Manager
-- Проблема: Manager не может получить доступ к таблице users из-за RLS

-- Удаляем старые политики
DROP POLICY IF EXISTS "HR и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR и Admin могут создавать пользователей" ON users;

-- Создаем новые политики с включением Manager
CREATE POLICY "HR, Manager и Admin могут видеть всех пользователей" ON users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'manager', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "HR, Manager и Admin могут изменять пользователей" ON users
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'manager', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "HR, Manager и Admin могут создавать пользователей" ON users
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'manager', 'admin') AND status = 'active'
        )
    );

-- Также добавляем политику для других таблиц, которые может использовать Manager
-- work_withdrawals
ALTER TABLE work_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager может видеть все выводы" ON work_withdrawals
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "Manager может изменять выводы" ON work_withdrawals
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin') AND status = 'active'
        )
    );

-- works
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager может видеть все работы" ON works
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin') AND status = 'active'
        )
    );

-- casinos
ALTER TABLE casinos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все могут видеть казино" ON casinos
    FOR SELECT USING (true);

-- Проверяем результат
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'work_withdrawals', 'works', 'casinos')
ORDER BY tablename, policyname;
