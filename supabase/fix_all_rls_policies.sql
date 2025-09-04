-- Полное исправление всех RLS политик для Manager роли
-- Проблема: Manager не может получить доступ к различным таблицам

-- 1. Проверяем текущие политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('users', 'works', 'work_withdrawals', 'casinos', 'cards', 'bank_accounts', 'banks')
ORDER BY tablename, policyname;

-- 2. Исправляем политики для таблицы users (если еще не исправлено)
DROP POLICY IF EXISTS "HR и Admin могут видеть всех пользователей" ON users;
DROP POLICY IF EXISTS "HR и Admin могут изменять пользователей" ON users;
DROP POLICY IF EXISTS "HR и Admin могут создавать пользователей" ON users;

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

-- 3. Исправляем политики для works
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Пользователи могут видеть свои работы" ON works;
DROP POLICY IF EXISTS "Manager может видеть все работы" ON works;

-- Создаем новые политики
CREATE POLICY "Junior может видеть свои работы" ON works
    FOR SELECT USING (
        junior_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Manager и Admin могут видеть все работы" ON works
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "Junior может создавать работы" ON works
    FOR INSERT WITH CHECK (
        junior_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

CREATE POLICY "Junior может изменять свои работы" ON works
    FOR UPDATE USING (
        junior_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- 4. Исправляем политики для work_withdrawals
ALTER TABLE work_withdrawals ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Manager может видеть все выводы" ON work_withdrawals;
DROP POLICY IF EXISTS "Manager может изменять выводы" ON work_withdrawals;

-- Создаем новые политики
CREATE POLICY "Junior может видеть свои выводы" ON work_withdrawals
    FOR SELECT USING (
        work_id IN (
            SELECT w.id FROM works w 
            JOIN users u ON w.junior_id = u.id 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Manager и Admin могут видеть все выводы" ON work_withdrawals
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "Junior может создавать выводы" ON work_withdrawals
    FOR INSERT WITH CHECK (
        work_id IN (
            SELECT w.id FROM works w 
            JOIN users u ON w.junior_id = u.id 
            WHERE u.auth_id = auth.uid() AND u.role = 'junior'
        )
    );

CREATE POLICY "Junior может изменять свои выводы" ON work_withdrawals
    FOR UPDATE USING (
        work_id IN (
            SELECT w.id FROM works w 
            JOIN users u ON w.junior_id = u.id 
            WHERE u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Manager может изменять все выводы" ON work_withdrawals
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin') AND status = 'active'
        )
    );

-- 5. Исправляем политики для casinos
ALTER TABLE casinos ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Все могут видеть казино" ON casinos;

-- Создаем новые политики
CREATE POLICY "Все аутентифицированные пользователи могут видеть казино" ON casinos
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Manager и Admin могут изменять казино" ON casinos
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin', 'tester') AND status = 'active'
        )
    );

-- 6. Исправляем политики для cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все могут видеть карты" ON cards
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Manager может изменять карты" ON cards
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin', 'cfo') AND status = 'active'
        )
    );

-- 7. Исправляем политики для banks
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все могут видеть банки" ON banks
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Manager может изменять банки" ON banks
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin', 'cfo') AND status = 'active'
        )
    );

-- 8. Исправляем политики для bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все могут видеть банковские аккаунты" ON bank_accounts
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Manager может изменять банковские аккаунты" ON bank_accounts
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'admin', 'cfo') AND status = 'active'
        )
    );

-- 9. Проверяем результат
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('users', 'works', 'work_withdrawals', 'casinos', 'cards', 'bank_accounts', 'banks')
ORDER BY tablename, policyname;
