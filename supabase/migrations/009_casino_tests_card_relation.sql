-- Добавление связи между casino_tests и cards
-- Исправление отсутствующего поля card_id в casino_tests

-- Добавляем поле card_id в таблицу casino_tests если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'card_id'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN card_id UUID REFERENCES cards(id);
  END IF;
END $$;

-- Добавляем поля для расширенной функциональности тестов
DO $$ 
BEGIN
  -- Поле для типа теста
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'test_type'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN test_type VARCHAR(20) DEFAULT 'full';
  END IF;

  -- Поле для рейтинга казино
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'rating'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 10);
  END IF;

  -- Поля для сумм тестирования
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'deposit_test_amount'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN deposit_test_amount NUMERIC(10,2) DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'withdrawal_test_amount'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN withdrawal_test_amount NUMERIC(10,2) DEFAULT 50;
  END IF;

  -- Поле для заметок теста
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'test_notes'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN test_notes TEXT;
  END IF;

  -- Поля для завершения теста
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'issues_found_text'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN issues_found_text TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'recommendations'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN recommendations TEXT;
  END IF;

  -- Поля для времени выполнения
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'casino_tests' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE casino_tests ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
END $$;

-- Обновляем существующие записи для совместимости
UPDATE casino_tests 
SET test_type = 'full' 
WHERE test_type IS NULL;

-- Индекс для связи с картами
CREATE INDEX IF NOT EXISTS idx_casino_tests_card ON casino_tests(card_id) 
WHERE card_id IS NOT NULL;

-- Комментарии для документации
COMMENT ON COLUMN casino_tests.card_id IS 'Карта, используемая для тестирования казино';
COMMENT ON COLUMN casino_tests.test_type IS 'Тип теста: full, deposit, withdrawal';
COMMENT ON COLUMN casino_tests.rating IS 'Рейтинг казино от 1 до 10 звезд';
COMMENT ON COLUMN casino_tests.deposit_test_amount IS 'Сумма тестового депозита';
COMMENT ON COLUMN casino_tests.withdrawal_test_amount IS 'Сумма тестового вывода';
