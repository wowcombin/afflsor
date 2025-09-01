-- Миграция 002: Система карт и банков

-- Создаем типы для карт
CREATE TYPE card_type AS ENUM ('grey', 'pink');
CREATE TYPE card_status AS ENUM ('active', 'inactive', 'expired', 'blocked', 'low_balance');

-- Таблица банков
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица банковских аккаунтов
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  holder_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(50),
  balance NUMERIC(12,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  balance_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  balance_updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица карт
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  card_number_mask VARCHAR(20) NOT NULL, -- Маскированный номер (1234****5678)
  card_bin VARCHAR(8) NOT NULL, -- Первые 6-8 цифр
  card_type card_type DEFAULT 'grey',
  exp_month INTEGER NOT NULL CHECK (exp_month >= 1 AND exp_month <= 12),
  exp_year INTEGER NOT NULL CHECK (exp_year >= 2024),
  status card_status DEFAULT 'active',
  assigned_to UUID REFERENCES users(id), -- Назначена Junior
  assigned_at TIMESTAMP WITH TIME ZONE,
  daily_limit NUMERIC(10,2), -- Дневной лимит для розовых карт
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица зашифрованных секретов карт
CREATE TABLE card_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  pan_encrypted TEXT NOT NULL, -- Зашифрованный полный номер
  cvv_encrypted TEXT NOT NULL, -- Зашифрованный CVV
  encryption_key_id VARCHAR(50) NOT NULL, -- ID ключа шифрования
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории доступа к секретам карт
CREATE TABLE card_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  access_type VARCHAR(20) NOT NULL, -- 'pan', 'cvv', 'full'
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  context JSONB, -- Дополнительная информация (casino_id, work_id и т.д.)
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица назначений карт
CREATE TABLE card_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active', -- active, completed, revoked
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Индексы для производительности
CREATE INDEX idx_banks_name ON banks(name);
CREATE INDEX idx_banks_is_active ON banks(is_active);

CREATE INDEX idx_bank_accounts_bank_id ON bank_accounts(bank_id);
CREATE INDEX idx_bank_accounts_balance ON bank_accounts(balance);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

CREATE INDEX idx_cards_bank_account_id ON cards(bank_account_id);
CREATE INDEX idx_cards_bin ON cards(card_bin);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_assigned_to ON cards(assigned_to);
CREATE INDEX idx_cards_type ON cards(card_type);

CREATE INDEX idx_card_secrets_card_id ON card_secrets(card_id);

CREATE INDEX idx_card_access_log_card_id ON card_access_log(card_id);
CREATE INDEX idx_card_access_log_user_id ON card_access_log(user_id);
CREATE INDEX idx_card_access_log_accessed_at ON card_access_log(accessed_at);

CREATE INDEX idx_card_assignments_card_id ON card_assignments(card_id);
CREATE INDEX idx_card_assignments_user_id ON card_assignments(user_id);
CREATE INDEX idx_card_assignments_status ON card_assignments(status);

-- Функция для обновления updated_at в банках и аккаунтах
CREATE TRIGGER update_banks_updated_at 
    BEFORE UPDATE ON banks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at 
    BEFORE UPDATE ON bank_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at 
    BEFORE UPDATE ON cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического управления доступностью карт при изменении баланса
CREATE OR REPLACE FUNCTION handle_bank_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Баланс упал ниже $10 - скрываем карты
  IF NEW.balance < 10 AND OLD.balance >= 10 THEN
    UPDATE cards
    SET status = 'low_balance'
    WHERE bank_account_id = NEW.id
      AND status = 'active';
      
    -- Логируем событие
    INSERT INTO card_access_log (card_id, user_id, access_type, success, context)
    SELECT c.id, NEW.balance_updated_by, 'balance_change', true, 
           jsonb_build_object('event', 'cards_hidden', 'old_balance', OLD.balance, 'new_balance', NEW.balance)
    FROM cards c 
    WHERE c.bank_account_id = NEW.id AND c.status = 'low_balance';

  -- Баланс восстановлен выше $10 - восстанавливаем карты
  ELSIF NEW.balance >= 10 AND OLD.balance < 10 THEN
    UPDATE cards
    SET status = 'active'
    WHERE bank_account_id = NEW.id
      AND status = 'low_balance';
      
    -- Логируем восстановление
    INSERT INTO card_access_log (card_id, user_id, access_type, success, context)
    SELECT c.id, NEW.balance_updated_by, 'balance_change', true,
           jsonb_build_object('event', 'cards_restored', 'old_balance', OLD.balance, 'new_balance', NEW.balance)
    FROM cards c 
    WHERE c.bank_account_id = NEW.id AND c.status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на изменение баланса
CREATE TRIGGER trg_bank_balance_change
  AFTER UPDATE OF balance ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION handle_bank_balance_change();

-- Представление доступных карт для Junior
CREATE VIEW available_cards_for_junior AS
SELECT 
  c.id,
  c.card_number_mask,
  c.card_bin,
  c.card_type,
  c.exp_month,
  c.exp_year,
  c.status,
  c.assigned_to,
  c.daily_limit,
  ba.balance as bank_balance,
  ba.holder_name as account_holder,
  b.name as bank_name,
  b.country as bank_country,
  CASE 
    WHEN ba.balance >= 10 AND c.status = 'active' THEN TRUE
    ELSE FALSE
  END as is_available,
  u.first_name as assigned_user_name,
  u.last_name as assigned_user_lastname
FROM cards c
JOIN bank_accounts ba ON c.bank_account_id = ba.id
JOIN banks b ON ba.bank_id = b.id
LEFT JOIN users u ON c.assigned_to = u.id
WHERE c.status IN ('active', 'low_balance');

-- RLS для карт (пока отключаем для простоты)
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_secrets DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_access_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE banks DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;

-- Комментарии к таблицам
COMMENT ON TABLE banks IS 'Банки для банковских аккаунтов';
COMMENT ON TABLE bank_accounts IS 'Банковские аккаунты с балансами';
COMMENT ON TABLE cards IS 'Банковские карты с маскированными номерами';
COMMENT ON TABLE card_secrets IS 'Зашифрованные секреты карт (PAN, CVV)';
COMMENT ON TABLE card_access_log IS 'Логи доступа к секретам карт';
COMMENT ON TABLE card_assignments IS 'История назначений карт пользователям';

-- Вставляем тестовые данные
INSERT INTO banks (name, country, currency) VALUES
('Chase Bank', 'USA', 'USD'),
('Bank of America', 'USA', 'USD'),
('Wells Fargo', 'USA', 'USD');

INSERT INTO bank_accounts (bank_id, holder_name, account_number, balance) 
SELECT 
  b.id, 
  'Test Account ' || b.name, 
  '****' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 150.00  -- Достаточно для карт
    WHEN ROW_NUMBER() OVER() = 2 THEN 5.00    -- Низкий баланс
    ELSE 100.00
  END
FROM banks b;

-- Вставляем тестовые карты
INSERT INTO cards (bank_account_id, card_number_mask, card_bin, card_type, exp_month, exp_year, status)
SELECT 
  ba.id,
  '1234****' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  '123456' || LPAD((ROW_NUMBER() OVER())::text, 2, '0'),
  CASE WHEN ROW_NUMBER() OVER() % 3 = 0 THEN 'pink'::card_type ELSE 'grey'::card_type END,
  12,
  2026,
  CASE WHEN ba.balance >= 10 THEN 'active'::card_status ELSE 'low_balance'::card_status END
FROM bank_accounts ba;

-- Вставляем тестовые зашифрованные секреты (в реальности будут зашифрованы)
INSERT INTO card_secrets (card_id, pan_encrypted, cvv_encrypted, encryption_key_id)
SELECT 
  c.id,
  'ENCRYPTED_PAN_' || c.id,
  'ENCRYPTED_CVV_' || c.id,
  'test_key_v1'
FROM cards c;
