-- Добавление недостающих колонок в таблицу paypal_accounts
-- Миграция 049: Исправление структуры PayPal таблицы

-- Добавляем колонку currency (обязательная)
ALTER TABLE paypal_accounts 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'GBP';

-- Добавляем другие недостающие колонки, которые используются в коде
ALTER TABLE paypal_accounts 
ADD COLUMN IF NOT EXISTS balance_send DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS send_paypal_balance VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_paypal_email VARCHAR(255);

-- Обновляем комментарии
COMMENT ON COLUMN paypal_accounts.currency IS 'Валюта баланса PayPal аккаунта (GBP, USD, EUR, CAD)';
COMMENT ON COLUMN paypal_accounts.balance_send IS 'Сумма для отправки';
COMMENT ON COLUMN paypal_accounts.send_paypal_balance IS 'Баланс для отправки (строка)';
COMMENT ON COLUMN paypal_accounts.sender_paypal_email IS 'Email отправителя для операций';

-- Добавляем ограничение на валюту
ALTER TABLE paypal_accounts 
ADD CONSTRAINT paypal_accounts_currency_check 
CHECK (currency IN ('GBP', 'USD', 'EUR', 'CAD'));
