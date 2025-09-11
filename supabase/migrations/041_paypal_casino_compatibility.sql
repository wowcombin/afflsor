-- Система совместимости PayPal с казино
-- Миграция 041: PayPal совместимость с казино

-- Добавляем поле для PayPal совместимости в таблицу казино
ALTER TABLE casinos 
ADD COLUMN paypal_compatible BOOLEAN DEFAULT FALSE,
ADD COLUMN allowed_paypal_domains TEXT[], -- Массив разрешенных доменов PayPal (например: ['@outlook.com', '@gmail.com'])
ADD COLUMN paypal_notes TEXT; -- Заметки о работе с PayPal

-- Создание таблицы отметок PayPal для казино (аналог BIN отметок)
CREATE TABLE casino_paypal_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    paypal_account_id UUID NOT NULL REFERENCES paypal_accounts(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    test_result VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
    notes TEXT,
    
    -- Результаты тестирования
    deposit_test_amount DECIMAL(10,2),
    deposit_test_success BOOLEAN,
    withdrawal_test_amount DECIMAL(10,2),
    withdrawal_test_success BOOLEAN,
    test_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность будет создана индексом
);

-- Создание индексов
CREATE INDEX idx_casino_paypal_assignments_casino_id ON casino_paypal_assignments(casino_id);
CREATE INDEX idx_casino_paypal_assignments_paypal_account_id ON casino_paypal_assignments(paypal_account_id);
CREATE INDEX idx_casino_paypal_assignments_assigned_by ON casino_paypal_assignments(assigned_by);
CREATE INDEX idx_casino_paypal_assignments_test_result ON casino_paypal_assignments(test_result);
CREATE INDEX idx_casino_paypal_assignments_active ON casino_paypal_assignments(is_active);

-- Создание уникального индекса с условием для активных отметок
CREATE UNIQUE INDEX unique_paypal_casino_active 
    ON casino_paypal_assignments(casino_id, paypal_account_id) 
    WHERE is_active = TRUE;

-- Триггер для обновления updated_at
CREATE TRIGGER update_casino_paypal_assignments_updated_at 
    BEFORE UPDATE ON casino_paypal_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE casino_paypal_assignments ENABLE ROW LEVEL SECURITY;

-- Tester может управлять отметками PayPal
CREATE POLICY "casino_paypal_assignments_tester" ON casino_paypal_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'tester' 
            AND status = 'active'
        )
    );

-- Manager, CFO, HR, Admin могут просматривать отметки
CREATE POLICY "casino_paypal_assignments_admin" ON casino_paypal_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'hr', 'admin') 
            AND status = 'active'
        )
    );

-- Junior и Team Lead могут видеть результаты тестов для своих аккаунтов
CREATE POLICY "casino_paypal_assignments_junior" ON casino_paypal_assignments
    FOR SELECT USING (
        paypal_account_id IN (
            SELECT pa.id 
            FROM paypal_accounts pa 
            JOIN users u ON pa.user_id = u.id 
            WHERE u.auth_id = auth.uid() 
            OR (u.team_lead_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
            ))
        )
    );

-- Комментарии к таблице
COMMENT ON TABLE casino_paypal_assignments IS 'Отметки Tester-а о совместимости PayPal аккаунтов с казино (аналог BIN отметок)';
COMMENT ON COLUMN casinos.paypal_compatible IS 'Поддерживает ли казино работу с PayPal';
COMMENT ON COLUMN casinos.allowed_paypal_domains IS 'Разрешенные домены для PayPal email (например: @outlook.com, @gmail.com)';
COMMENT ON COLUMN casinos.paypal_notes IS 'Заметки Tester-а о работе казино с PayPal';

COMMENT ON COLUMN casino_paypal_assignments.casino_id IS 'Казино для тестирования';
COMMENT ON COLUMN casino_paypal_assignments.paypal_account_id IS 'PayPal аккаунт для тестирования';
COMMENT ON COLUMN casino_paypal_assignments.assigned_by IS 'Tester, который назначил тест';
COMMENT ON COLUMN casino_paypal_assignments.test_result IS 'Результат тестирования (pending, success, failed)';
COMMENT ON COLUMN casino_paypal_assignments.deposit_test_success IS 'Успешен ли тест депозита';
COMMENT ON COLUMN casino_paypal_assignments.withdrawal_test_success IS 'Успешен ли тест вывода';
