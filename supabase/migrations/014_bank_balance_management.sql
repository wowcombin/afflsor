-- Миграция 014: Управление балансами банковских аккаунтов

-- Создаем таблицу банков если не существует
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу банковских аккаунтов
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES banks(id),
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

-- Добавляем поле bank_account_id в таблицу cards если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE cards ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);
    END IF;
END $$;

-- Таблица истории изменений балансов
CREATE TABLE IF NOT EXISTS bank_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  old_balance NUMERIC(12,2),
  new_balance NUMERIC(12,2),
  change_amount NUMERIC(12,2),
  change_reason TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Функция для обновления баланса с логированием
CREATE OR REPLACE FUNCTION update_bank_balance(
  p_account_id UUID,
  p_new_balance NUMERIC,
  p_user_id UUID,
  p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_balance NUMERIC;
  v_change_amount NUMERIC;
BEGIN
  -- Получаем текущий баланс
  SELECT balance INTO v_old_balance
  FROM bank_accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Банковский аккаунт не найден';
  END IF;

  -- Проверяем валидность нового баланса
  IF p_new_balance < 0 THEN
    RAISE EXCEPTION 'Баланс не может быть отрицательным';
  END IF;

  v_change_amount := p_new_balance - v_old_balance;

  -- Обновляем баланс
  UPDATE bank_accounts
  SET balance = p_new_balance,
      balance_updated_at = NOW(),
      balance_updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_account_id;

  -- Логируем изменение
  INSERT INTO bank_balance_history (
    bank_account_id,
    old_balance,
    new_balance,
    change_amount,
    change_reason,
    changed_by
  ) VALUES (
    p_account_id,
    v_old_balance,
    p_new_balance,
    v_change_amount,
    p_comment,
    p_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического управления доступностью карт
CREATE OR REPLACE FUNCTION handle_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Баланс упал ниже $10
  IF NEW.balance < 10 AND OLD.balance >= 10 THEN
    -- Помечаем карты как недоступные
    UPDATE cards
    SET status = 'low_balance'
    WHERE bank_account_id = NEW.id
      AND status = 'active';
    
    -- Логируем событие
    INSERT INTO bank_balance_history (
      bank_account_id,
      old_balance,
      new_balance,
      change_amount,
      change_reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.balance,
      NEW.balance,
      NEW.balance - OLD.balance,
      'Автоматическое скрытие карт: баланс < $10',
      NEW.balance_updated_by
    );

  -- Баланс восстановлен выше $10
  ELSIF NEW.balance >= 10 AND OLD.balance < 10 THEN
    -- Восстанавливаем карты
    UPDATE cards
    SET status = 'active'
    WHERE bank_account_id = NEW.id
      AND status = 'low_balance';
    
    -- Логируем восстановление
    INSERT INTO bank_balance_history (
      bank_account_id,
      old_balance,
      new_balance,
      change_amount,
      change_reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.balance,
      NEW.balance,
      NEW.balance - OLD.balance,
      'Автоматическое восстановление карт: баланс >= $10',
      NEW.balance_updated_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS trg_bank_balance_change ON bank_accounts;
CREATE TRIGGER trg_bank_balance_change
  AFTER UPDATE OF balance ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION handle_balance_change();

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для updated_at
DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Представление для доступных карт с учетом баланса
CREATE OR REPLACE VIEW available_cards_for_junior AS
SELECT 
  c.id,
  c.card_number_mask,
  c.card_bin,
  c.exp_month,
  c.exp_year,
  c.status,
  c.casino_id,
  c.junior_id,
  ba.balance as bank_balance,
  b.name as bank_name,
  ba.holder_name,
  CASE 
    WHEN ba.balance >= 10 AND c.status = 'active' THEN TRUE
    ELSE FALSE
  END as is_available
FROM cards c
LEFT JOIN bank_accounts ba ON c.bank_account_id = ba.id
LEFT JOIN banks b ON ba.bank_id = b.id
WHERE c.status IN ('active', 'low_balance');

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_banks_is_active ON banks(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_id ON bank_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_balance ON bank_accounts(balance);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_balance_history_account_id ON bank_balance_history(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_balance_history_changed_by ON bank_balance_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_cards_bank_account_id ON cards(bank_account_id);

-- Комментарии к таблицам
COMMENT ON TABLE banks IS 'Банки для банковских аккаунтов';
COMMENT ON TABLE bank_accounts IS 'Банковские аккаунты с балансами';
COMMENT ON TABLE bank_balance_history IS 'История изменений балансов банковских аккаунтов';

COMMENT ON COLUMN bank_accounts.balance IS 'Текущий баланс аккаунта';
COMMENT ON COLUMN bank_accounts.balance_updated_by IS 'Кто последний обновлял баланс';
COMMENT ON COLUMN cards.bank_account_id IS 'Связь карты с банковским аккаунтом';

-- Вставляем тестовые данные если таблицы пустые
INSERT INTO banks (name, country, currency) 
SELECT 'Test Bank', 'USA', 'USD'
WHERE NOT EXISTS (SELECT 1 FROM banks);

INSERT INTO bank_accounts (bank_id, holder_name, account_number, balance)
SELECT b.id, 'Test Account', '1234567890', 100.00
FROM banks b
WHERE b.name = 'Test Bank'
  AND NOT EXISTS (SELECT 1 FROM bank_accounts WHERE bank_id = b.id);
