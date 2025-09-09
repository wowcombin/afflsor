-- Миграция 009: Обновления системы казино

-- Сначала удаляем представление которое использует поле promo
DROP VIEW IF EXISTS casinos_with_latest_test;

-- Добавляем новые поля в таблицу казино
ALTER TABLE casinos 
ADD COLUMN IF NOT EXISTS company VARCHAR(200),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Добавляем или изменяем поле promo на TEXT
DO $$ 
BEGIN
  -- Проверяем существует ли поле promo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casinos' AND column_name = 'promo'
  ) THEN
    -- Если существует, изменяем тип на TEXT
    ALTER TABLE casinos ALTER COLUMN promo TYPE TEXT;
  ELSE
    -- Если не существует, добавляем как TEXT
    ALTER TABLE casinos ADD COLUMN promo TEXT;
  END IF;
END $$;

CREATE VIEW casinos_with_latest_test AS
SELECT 
  c.id,
  c.name,
  c.url,
  c.promo,
  c.company,
  c.currency,
  c.status,
  c.allowed_bins,
  c.auto_approve_limit,
  c.withdrawal_time_value,
  c.withdrawal_time_unit,
  c.notes,
  c.created_at,
  c.updated_at,
  latest_test.id as latest_test_id,
  latest_test.status as latest_test_status,
  latest_test.test_result,
  latest_test.rating,
  latest_test.completed_at as last_tested_at,
  tester.first_name as last_tester_first_name,
  tester.last_name as last_tester_last_name
FROM casinos c
LEFT JOIN LATERAL (
  SELECT ct.id, ct.status, ct.test_result, ct.rating, ct.completed_at, ct.tester_id
  FROM casino_tests ct
  WHERE ct.casino_id = c.id
  ORDER BY ct.created_at DESC
  LIMIT 1
) latest_test ON true
LEFT JOIN users tester ON latest_test.tester_id = tester.id
ORDER BY 
  CASE 
    WHEN c.status = 'approved' THEN 1
    WHEN c.status = 'testing' THEN 2
    WHEN c.status = 'new' THEN 3
    WHEN c.status = 'blocked' THEN 4
    ELSE 5
  END,
  c.name;

-- Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_casinos_company ON casinos(company);
CREATE INDEX IF NOT EXISTS idx_casinos_promo ON casinos(promo);
CREATE INDEX IF NOT EXISTS idx_casinos_currency ON casinos(currency);

-- Комментарии к новым полям
COMMENT ON COLUMN casinos.promo IS 'Промо код или ссылка казино (без ограничения длины)';
COMMENT ON COLUMN casinos.company IS 'Компания владелец казино';
COMMENT ON COLUMN casinos.currency IS 'Валюта казино (USD, EUR, GBP, CAD)';

-- Обновляем тестовые данные
UPDATE casinos SET 
  promo = CASE 
    WHEN name LIKE '%1%' THEN 'BONUS100'
    WHEN name LIKE '%2%' THEN 'WELCOME50'
    ELSE 'START25'
  END,
  company = CASE 
    WHEN name LIKE '%1%' THEN 'Casino Group Ltd'
    WHEN name LIKE '%2%' THEN 'Gaming Solutions Inc'
    ELSE 'Entertainment Corp'
  END,
  currency = CASE 
    WHEN name LIKE '%1%' THEN 'USD'
    WHEN name LIKE '%2%' THEN 'EUR'
    ELSE 'GBP'
  END
WHERE promo IS NULL OR company IS NULL OR currency IS NULL;
