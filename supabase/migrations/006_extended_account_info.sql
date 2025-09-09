-- Миграция 006: Расширенная информация об аккаунтах
-- Добавляем Sort Code, ссылку на банк и пароль

-- Добавляем новые поля в таблицу bank_accounts
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS sort_code VARCHAR(8),
ADD COLUMN IF NOT EXISTS bank_url TEXT,
ADD COLUMN IF NOT EXISTS login_password TEXT;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN bank_accounts.sort_code IS 'Sort Code для UK банков';
COMMENT ON COLUMN bank_accounts.bank_url IS 'Ссылка на онлайн банкинг';
COMMENT ON COLUMN bank_accounts.login_password IS 'Пароль для доступа к аккаунту';

-- Обновляем представление bank_summary для включения новых полей
DROP VIEW IF EXISTS bank_summary;
CREATE VIEW bank_summary AS
SELECT 
  b.id,
  b.name,
  b.country,
  b.currency,
  b.is_active,
  COUNT(ba.id) as total_accounts,
  COUNT(CASE WHEN ba.is_active = true THEN 1 END) as active_accounts,
  COALESCE(SUM(CASE WHEN ba.is_active = true THEN ba.balance ELSE 0 END), 0) as total_balance,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_cards
FROM banks b
LEFT JOIN bank_accounts ba ON ba.bank_id = b.id
LEFT JOIN cards c ON c.bank_account_id = ba.id
GROUP BY b.id, b.name, b.country, b.currency, b.is_active;

-- Обновляем представление cards_with_bank_info для включения расширенной информации
DROP VIEW IF EXISTS cards_with_bank_info;
CREATE VIEW cards_with_bank_info AS
SELECT 
  c.*,
  ba.holder_name as account_holder,
  ba.balance as account_balance,
  ba.currency as account_currency,
  ba.is_active as account_active,
  ba.sort_code,
  ba.bank_url,
  b.name as bank_name,
  b.country as bank_country,
  b.is_active as bank_active,
  u.first_name as assigned_first_name,
  u.last_name as assigned_last_name,
  u.email as assigned_email
FROM cards c
JOIN bank_accounts ba ON c.bank_account_id = ba.id
JOIN banks b ON ba.bank_id = b.id
LEFT JOIN users u ON c.assigned_to = u.id;

-- Добавляем тестовые данные для существующих аккаунтов
UPDATE bank_accounts 
SET 
  sort_code = CASE 
    WHEN id = (SELECT id FROM bank_accounts LIMIT 1 OFFSET 0) THEN '12-34-56'
    WHEN id = (SELECT id FROM bank_accounts LIMIT 1 OFFSET 1) THEN '78-90-12'
    ELSE '11-22-33'
  END,
  bank_url = CASE 
    WHEN id = (SELECT id FROM bank_accounts LIMIT 1 OFFSET 0) THEN 'https://chase.com'
    WHEN id = (SELECT id FROM bank_accounts LIMIT 1 OFFSET 1) THEN 'https://deutsche-bank.de'
    ELSE 'https://example-bank.com'
  END,
  login_password = CASE 
    WHEN id = (SELECT id FROM bank_accounts LIMIT 1 OFFSET 0) THEN 'SecurePass123!'
    WHEN id = (SELECT id FROM bank_accounts LIMIT 1 OFFSET 1) THEN 'BankPass456@'
    ELSE 'DefaultPass789#'
  END
WHERE sort_code IS NULL;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_bank_accounts_sort_code ON bank_accounts(sort_code);

-- Добавляем RLS политики для новых полей (наследуются от основной таблицы)
-- Политики уже существуют для bank_accounts, новые поля автоматически защищены
