-- Система работ на PayPal
-- Миграция 038: PayPal работы

-- Создание таблицы работ на PayPal
CREATE TABLE paypal_works (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_account_id UUID NOT NULL REFERENCES paypal_accounts(id) ON DELETE CASCADE,
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    
    -- Данные казино
    casino_email VARCHAR(255) NOT NULL,
    casino_password VARCHAR(255) NOT NULL,
    
    -- Финансовые данные
    deposit_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Статусы и метки времени
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Дополнительная информация
    notes TEXT,
    
    -- Проверки
    CONSTRAINT paypal_works_deposit_positive CHECK (deposit_amount > 0)
);

-- Создание индексов
CREATE INDEX idx_paypal_works_user_id ON paypal_works(user_id);
CREATE INDEX idx_paypal_works_paypal_account_id ON paypal_works(paypal_account_id);
CREATE INDEX idx_paypal_works_casino_id ON paypal_works(casino_id);
CREATE INDEX idx_paypal_works_status ON paypal_works(status);
CREATE INDEX idx_paypal_works_created_at ON paypal_works(created_at);

-- Триггер для обновления updated_at
CREATE TRIGGER update_paypal_works_updated_at 
    BEFORE UPDATE ON paypal_works 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE paypal_works ENABLE ROW LEVEL SECURITY;

-- Junior может видеть и создавать только свои работы
CREATE POLICY "paypal_works_junior_own" ON paypal_works
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Team Lead может видеть работы своих Junior'ов
CREATE POLICY "paypal_works_teamlead" ON paypal_works
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE team_lead_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
            )
        )
    );

-- Manager, CFO, Tester, HR, Admin могут видеть все работы
CREATE POLICY "paypal_works_admin" ON paypal_works
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'tester', 'hr', 'admin') 
            AND status = 'active'
        )
    );

-- Комментарии к таблице
COMMENT ON TABLE paypal_works IS 'Работы Junior-ов на PayPal аккаунтах';

COMMENT ON COLUMN paypal_works.user_id IS 'Junior, который создал работу';
COMMENT ON COLUMN paypal_works.paypal_account_id IS 'PayPal аккаунт, используемый для работы';
COMMENT ON COLUMN paypal_works.casino_id IS 'Казино, в котором выполняется работа';
COMMENT ON COLUMN paypal_works.casino_email IS 'Email для входа в казино';
COMMENT ON COLUMN paypal_works.casino_password IS 'Пароль для входа в казино';
COMMENT ON COLUMN paypal_works.deposit_amount IS 'Сумма депозита';
COMMENT ON COLUMN paypal_works.status IS 'Статус работы (active, completed, failed)';
