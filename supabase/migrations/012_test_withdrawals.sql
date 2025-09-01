-- Создание таблицы для множественных выводов тестовых работ
-- Позволяет создавать несколько выводов для одной работы

-- Создаем таблицу test_withdrawals
CREATE TABLE IF NOT EXISTS test_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES casino_tests(id) ON DELETE CASCADE,
  withdrawal_amount DECIMAL(10,2) NOT NULL,
  withdrawal_status VARCHAR(20) DEFAULT 'new',
  withdrawal_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_test_withdrawals_work_id ON test_withdrawals(work_id);
CREATE INDEX IF NOT EXISTS idx_test_withdrawals_status ON test_withdrawals(withdrawal_status);

-- Комментарии
COMMENT ON TABLE test_withdrawals IS 'Выводы для тестовых работ (множественные)';
COMMENT ON COLUMN test_withdrawals.work_id IS 'ID тестовой работы';
COMMENT ON COLUMN test_withdrawals.withdrawal_amount IS 'Сумма вывода';
COMMENT ON COLUMN test_withdrawals.withdrawal_status IS 'Статус: new, waiting, received, blocked';
COMMENT ON COLUMN test_withdrawals.withdrawal_notes IS 'Заметки к выводу';

-- Проверяем что таблица создана
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'test_withdrawals'
ORDER BY ordinal_position;
