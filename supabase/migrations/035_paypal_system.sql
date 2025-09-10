-- Создание системы PayPal аккаунтов
-- Миграция 035: PayPal система для Junior сотрудников

-- Создание enum для статуса PayPal аккаунтов (СНАЧАЛА)
CREATE TYPE paypal_status AS ENUM ('active', 'blocked', 'suspended');

-- Создание таблицы PayPal аккаунтов
CREATE TABLE paypal_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Основные данные аккаунта
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    authenticator_url TEXT,
    
    -- Финансовые данные
    date_created DATE NOT NULL DEFAULT CURRENT_DATE,
    balance DECIMAL(10,2) DEFAULT 0,
    
    -- Данные отправителя
    sender_paypal_email VARCHAR(255),
    balance_send DECIMAL(10,2) DEFAULT 0,
    send_paypal_balance VARCHAR(255),
    
    -- Дополнительная информация
    info TEXT,
    status paypal_status DEFAULT 'active',
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX idx_paypal_accounts_user_id ON paypal_accounts(user_id);
CREATE INDEX idx_paypal_accounts_status ON paypal_accounts(status);
CREATE INDEX idx_paypal_accounts_email ON paypal_accounts(email);

-- Триггер для обновления updated_at
CREATE TRIGGER update_paypal_accounts_updated_at 
    BEFORE UPDATE ON paypal_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики для PayPal аккаунтов
ALTER TABLE paypal_accounts ENABLE ROW LEVEL SECURITY;

-- Junior может видеть и управлять только своими PayPal аккаунтами
CREATE POLICY "paypal_accounts_own_access" ON paypal_accounts
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Team Lead может видеть PayPal аккаунты своих Junior'ов
CREATE POLICY "paypal_accounts_teamlead_access" ON paypal_accounts
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE team_lead_id IN (
                SELECT id FROM users 
                WHERE auth_id = auth.uid() AND role = 'teamlead' AND status = 'active'
            )
        )
    );

-- Manager, HR, CFO, Admin могут видеть все PayPal аккаунты
CREATE POLICY "paypal_accounts_admin_access" ON paypal_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'hr', 'cfo', 'admin', 'tester') 
            AND status = 'active'
        )
    );

-- Комментарии к таблице
COMMENT ON TABLE paypal_accounts IS 'PayPal аккаунты Junior сотрудников для работы с казино';
COMMENT ON COLUMN paypal_accounts.name IS 'Полное имя держателя PayPal аккаунта';
COMMENT ON COLUMN paypal_accounts.email IS 'Email для входа в PayPal';
COMMENT ON COLUMN paypal_accounts.password IS 'Пароль от PayPal аккаунта';
COMMENT ON COLUMN paypal_accounts.phone_number IS 'Номер телефона для 2FA';
COMMENT ON COLUMN paypal_accounts.authenticator_url IS 'Ссылка на 2FA аутентификатор';
COMMENT ON COLUMN paypal_accounts.balance IS 'Текущий баланс PayPal аккаунта в USD';
COMMENT ON COLUMN paypal_accounts.sender_paypal_email IS 'Email отправителя для переводов';
COMMENT ON COLUMN paypal_accounts.balance_send IS 'Баланс для отправки в USD';
COMMENT ON COLUMN paypal_accounts.send_paypal_balance IS 'PayPal для отправки баланса';
