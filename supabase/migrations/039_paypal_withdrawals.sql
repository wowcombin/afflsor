-- Система выводов с PayPal
-- Миграция 039: PayPal выводы

-- Создание таблицы выводов с PayPal
CREATE TABLE paypal_withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_work_id UUID NOT NULL REFERENCES paypal_works(id) ON DELETE CASCADE,
    paypal_account_id UUID NOT NULL REFERENCES paypal_accounts(id) ON DELETE CASCADE,
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    
    -- Финансовые данные
    withdrawal_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Статусы и проверки
    status VARCHAR(50) DEFAULT 'pending',
    manager_status VARCHAR(50) DEFAULT 'pending',
    teamlead_status VARCHAR(50) DEFAULT 'pending',
    
    -- Комментарии
    manager_comment TEXT,
    teamlead_comment TEXT,
    hr_comment TEXT,
    cfo_comment TEXT,
    
    -- Кто проверил
    checked_by_manager UUID REFERENCES users(id),
    checked_by_teamlead UUID REFERENCES users(id),
    checked_by_hr UUID REFERENCES users(id),
    checked_by_cfo UUID REFERENCES users(id),
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_at TIMESTAMP WITH TIME ZONE,
    
    -- Дополнительная информация
    notes TEXT,
    
    -- Проверки
    CONSTRAINT paypal_withdrawals_amount_positive CHECK (withdrawal_amount > 0),
    CONSTRAINT paypal_withdrawals_valid_status CHECK (
        status IN ('pending', 'approved', 'rejected', 'completed', 'failed')
    ),
    CONSTRAINT paypal_withdrawals_valid_manager_status CHECK (
        manager_status IN ('pending', 'approved', 'rejected')
    ),
    CONSTRAINT paypal_withdrawals_valid_teamlead_status CHECK (
        teamlead_status IN ('pending', 'approved', 'rejected')
    )
);

-- Создание индексов
CREATE INDEX idx_paypal_withdrawals_user_id ON paypal_withdrawals(user_id);
CREATE INDEX idx_paypal_withdrawals_paypal_work_id ON paypal_withdrawals(paypal_work_id);
CREATE INDEX idx_paypal_withdrawals_paypal_account_id ON paypal_withdrawals(paypal_account_id);
CREATE INDEX idx_paypal_withdrawals_casino_id ON paypal_withdrawals(casino_id);
CREATE INDEX idx_paypal_withdrawals_status ON paypal_withdrawals(status);
CREATE INDEX idx_paypal_withdrawals_manager_status ON paypal_withdrawals(manager_status);
CREATE INDEX idx_paypal_withdrawals_teamlead_status ON paypal_withdrawals(teamlead_status);
CREATE INDEX idx_paypal_withdrawals_created_at ON paypal_withdrawals(created_at);

-- Триггер для обновления updated_at
CREATE TRIGGER update_paypal_withdrawals_updated_at 
    BEFORE UPDATE ON paypal_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE paypal_withdrawals ENABLE ROW LEVEL SECURITY;

-- Junior может видеть и создавать только свои выводы
CREATE POLICY "paypal_withdrawals_junior_own" ON paypal_withdrawals
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Team Lead может видеть и одобрять выводы своих Junior'ов
CREATE POLICY "paypal_withdrawals_teamlead" ON paypal_withdrawals
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users 
            WHERE team_lead_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
            )
        )
    );

-- Manager, CFO, Tester, HR, Admin могут видеть и управлять всеми выводами
CREATE POLICY "paypal_withdrawals_admin" ON paypal_withdrawals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'tester', 'hr', 'admin') 
            AND status = 'active'
        )
    );

-- Комментарии к таблице
COMMENT ON TABLE paypal_withdrawals IS 'Выводы с PayPal аккаунтов (аналог обычных выводов с карт)';

COMMENT ON COLUMN paypal_withdrawals.user_id IS 'Junior, который создал вывод';
COMMENT ON COLUMN paypal_withdrawals.paypal_work_id IS 'Связанная PayPal работа';
COMMENT ON COLUMN paypal_withdrawals.paypal_account_id IS 'PayPal аккаунт для вывода';
COMMENT ON COLUMN paypal_withdrawals.casino_id IS 'Казино, из которого выводятся средства';
COMMENT ON COLUMN paypal_withdrawals.withdrawal_amount IS 'Сумма вывода';
COMMENT ON COLUMN paypal_withdrawals.status IS 'Общий статус вывода';
COMMENT ON COLUMN paypal_withdrawals.manager_status IS 'Статус проверки Manager-ом';
COMMENT ON COLUMN paypal_withdrawals.teamlead_status IS 'Статус проверки Team Lead-ом';
