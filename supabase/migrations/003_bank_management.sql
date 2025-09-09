-- Миграция 003: Расширенная банковская система

-- Таблица истории изменений балансов
CREATE TABLE bank_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  old_balance NUMERIC(12,2) NOT NULL,
  new_balance NUMERIC(12,2) NOT NULL,
  change_amount NUMERIC(12,2) NOT NULL,
  change_reason TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для истории балансов
CREATE INDEX idx_bank_balance_history_account_id ON bank_balance_history(bank_account_id);
CREATE INDEX idx_bank_balance_history_changed_by ON bank_balance_history(changed_by);
CREATE INDEX idx_bank_balance_history_created_at ON bank_balance_history(created_at);

-- Функция для безопасного обновления баланса с логированием
CREATE OR REPLACE FUNCTION update_bank_balance(
  p_account_id UUID,
  p_new_balance NUMERIC,
  p_user_id UUID,
  p_comment TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_balance NUMERIC;
  v_change_amount NUMERIC;
  v_account_name TEXT;
BEGIN
  -- Получаем текущий баланс и название аккаунта
  SELECT balance, holder_name INTO v_old_balance, v_account_name
  FROM bank_accounts
  WHERE id = p_account_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Банковский аккаунт не найден или неактивен';
  END IF;

  -- Проверяем валидность нового баланса
  IF p_new_balance < 0 THEN
    RAISE EXCEPTION 'Баланс не может быть отрицательным';
  END IF;

  -- Рассчитываем изменение
  v_change_amount := p_new_balance - v_old_balance;

  -- Если баланс не изменился, ничего не делаем
  IF v_change_amount = 0 THEN
    RETURN TRUE;
  END IF;

  -- Обновляем баланс
  UPDATE bank_accounts
  SET 
    balance = p_new_balance,
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
    changed_by,
    ip_address,
    user_agent
  ) VALUES (
    p_account_id,
    v_old_balance,
    p_new_balance,
    v_change_amount,
    COALESCE(p_comment, 'Изменение баланса'),
    p_user_id,
    p_ip_address::INET,
    p_user_agent
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка обновления баланса: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Представление для отчетов по банкам
CREATE VIEW bank_summary AS
SELECT 
  b.id as bank_id,
  b.name as bank_name,
  b.country,
  b.currency,
  COUNT(ba.id) as total_accounts,
  COUNT(CASE WHEN ba.is_active THEN 1 END) as active_accounts,
  COALESCE(SUM(ba.balance), 0) as total_balance,
  COUNT(CASE WHEN ba.balance >= 10 THEN 1 END) as accounts_with_sufficient_balance,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_cards,
  COUNT(CASE WHEN c.assigned_to IS NOT NULL THEN 1 END) as assigned_cards
FROM banks b
LEFT JOIN bank_accounts ba ON b.id = ba.bank_id
LEFT JOIN cards c ON ba.id = c.bank_account_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.name, b.country, b.currency
ORDER BY b.name;

-- Представление для карт с полной информацией о банке
CREATE VIEW cards_with_bank_info AS
SELECT 
  c.id,
  c.card_number_mask,
  c.card_bin,
  c.card_type,
  c.exp_month,
  c.exp_year,
  c.status,
  c.assigned_to,
  c.assigned_at,
  c.daily_limit,
  c.notes,
  c.created_at,
  ba.id as bank_account_id,
  ba.holder_name as account_holder,
  ba.account_number,
  ba.balance as account_balance,
  ba.currency as account_currency,
  ba.balance_updated_at,
  ba.balance_updated_by,
  b.id as bank_id,
  b.name as bank_name,
  b.country as bank_country,
  b.currency as bank_currency,
  u.first_name as assigned_user_first_name,
  u.last_name as assigned_user_last_name,
  u.email as assigned_user_email,
  ub.first_name as balance_updated_by_first_name,
  ub.last_name as balance_updated_by_last_name,
  ub.role as balance_updated_by_role,
  CASE 
    WHEN ba.balance >= 10 AND c.status = 'active' THEN TRUE
    ELSE FALSE
  END as is_available
FROM cards c
JOIN bank_accounts ba ON c.bank_account_id = ba.id
JOIN banks b ON ba.bank_id = b.id
LEFT JOIN users u ON c.assigned_to = u.id
LEFT JOIN users ub ON ba.balance_updated_by = ub.id
WHERE ba.is_active = TRUE AND b.is_active = TRUE;

-- Функция для получения статистики по банкам
CREATE OR REPLACE FUNCTION get_bank_statistics()
RETURNS TABLE (
  total_banks BIGINT,
  total_accounts BIGINT,
  total_balance NUMERIC,
  total_cards BIGINT,
  available_cards BIGINT,
  low_balance_accounts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT b.id) as total_banks,
    COUNT(DISTINCT ba.id) as total_accounts,
    COALESCE(SUM(ba.balance), 0) as total_balance,
    COUNT(DISTINCT c.id) as total_cards,
    COUNT(DISTINCT CASE WHEN ba.balance >= 10 AND c.status = 'active' THEN c.id END) as available_cards,
    COUNT(DISTINCT CASE WHEN ba.balance < 10 THEN ba.id END) as low_balance_accounts
  FROM banks b
  LEFT JOIN bank_accounts ba ON b.id = ba.bank_id AND ba.is_active = TRUE
  LEFT JOIN cards c ON ba.id = c.bank_account_id
  WHERE b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Отключаем RLS для новых таблиц (для простоты)
ALTER TABLE bank_balance_history DISABLE ROW LEVEL SECURITY;

-- Комментарии
COMMENT ON TABLE bank_balance_history IS 'История изменений балансов банковских аккаунтов';
COMMENT ON FUNCTION update_bank_balance IS 'Безопасное обновление баланса с полным логированием';
COMMENT ON VIEW bank_summary IS 'Сводная информация по банкам для отчетов';
COMMENT ON VIEW cards_with_bank_info IS 'Карты с полной информацией о банках для интерфейсов';

-- Вставляем тестовые изменения балансов для демонстрации
INSERT INTO bank_balance_history (bank_account_id, old_balance, new_balance, change_amount, change_reason, changed_by)
SELECT 
  ba.id,
  0.00,
  ba.balance,
  ba.balance,
  'Начальное пополнение при создании системы',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM bank_accounts ba
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');
