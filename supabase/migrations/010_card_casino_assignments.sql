-- Миграция 010: Система назначения карт на несколько казино

-- Создаем таблицу связей карта-казино (многие ко многим)
CREATE TABLE card_casino_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id), -- Кто назначил (tester или manager)
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'testing', -- testing, work
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  deposit_amount NUMERIC(10,2), -- Сумма депозита если был сделан
  deposit_date TIMESTAMP WITH TIME ZONE, -- Когда был депозит
  withdrawal_amount NUMERIC(10,2), -- Сумма вывода если был
  withdrawal_date TIMESTAMP WITH TIME ZONE, -- Когда был вывод
  notes TEXT, -- Заметки по работе
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: одна карта может быть назначена на одно казино только один раз
  UNIQUE(card_id, casino_id)
);

-- Индексы для производительности
CREATE INDEX idx_card_casino_assignments_card_id ON card_casino_assignments(card_id);
CREATE INDEX idx_card_casino_assignments_casino_id ON card_casino_assignments(casino_id);
CREATE INDEX idx_card_casino_assignments_assigned_by ON card_casino_assignments(assigned_by);
CREATE INDEX idx_card_casino_assignments_status ON card_casino_assignments(status);
CREATE INDEX idx_card_casino_assignments_assignment_type ON card_casino_assignments(assignment_type);

-- Триггер для updated_at
CREATE TRIGGER update_card_casino_assignments_updated_at 
    BEFORE UPDATE ON card_casino_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Представление для карт с назначениями
CREATE VIEW cards_with_assignments AS
SELECT 
  c.*,
  ba.holder_name as account_holder,
  ba.balance as account_balance,
  ba.currency as account_currency,
  b.name as bank_name,
  b.country as bank_country,
  COALESCE(
    json_agg(
      CASE WHEN cca.id IS NOT NULL THEN
        json_build_object(
          'assignment_id', cca.id,
          'casino_id', cca.casino_id,
          'casino_name', cas.name,
          'casino_company', cas.company,
          'assignment_type', cca.assignment_type,
          'status', cca.status,
          'deposit_amount', cca.deposit_amount,
          'has_deposit', cca.deposit_amount IS NOT NULL,
          'assigned_at', cca.created_at
        )
      END
    ) FILTER (WHERE cca.id IS NOT NULL),
    '[]'::json
  ) as casino_assignments
FROM cards c
LEFT JOIN bank_accounts ba ON c.bank_account_id = ba.id
LEFT JOIN banks b ON ba.bank_id = b.id
LEFT JOIN card_casino_assignments cca ON c.id = cca.card_id AND cca.status = 'active'
LEFT JOIN casinos cas ON cca.casino_id = cas.id
GROUP BY c.id, ba.holder_name, ba.balance, ba.currency, b.name, b.country
ORDER BY c.created_at DESC;

-- Функция для назначения карты на казино
CREATE OR REPLACE FUNCTION assign_card_to_casino(
  p_card_id UUID,
  p_casino_id UUID,
  p_assigned_by UUID,
  p_assignment_type VARCHAR(20) DEFAULT 'testing'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_card_exists BOOLEAN;
  v_casino_exists BOOLEAN;
  v_assignment_exists BOOLEAN;
BEGIN
  -- Проверяем существование карты
  SELECT EXISTS(SELECT 1 FROM cards WHERE id = p_card_id AND status = 'active') INTO v_card_exists;
  
  IF NOT v_card_exists THEN
    RETURN json_build_object('success', false, 'error', 'Карта не найдена или неактивна');
  END IF;
  
  -- Проверяем существование казино
  SELECT EXISTS(SELECT 1 FROM casinos WHERE id = p_casino_id) INTO v_casino_exists;
  
  IF NOT v_casino_exists THEN
    RETURN json_build_object('success', false, 'error', 'Казино не найдено');
  END IF;
  
  -- Проверяем существование назначения
  SELECT EXISTS(
    SELECT 1 FROM card_casino_assignments 
    WHERE card_id = p_card_id AND casino_id = p_casino_id AND status = 'active'
  ) INTO v_assignment_exists;
  
  IF v_assignment_exists THEN
    RETURN json_build_object('success', false, 'error', 'Карта уже назначена на это казино');
  END IF;
  
  -- Создаем назначение
  INSERT INTO card_casino_assignments (card_id, casino_id, assigned_by, assignment_type)
  VALUES (p_card_id, p_casino_id, p_assigned_by, p_assignment_type);
  
  RETURN json_build_object('success', true, 'message', 'Карта успешно назначена');
END;
$$ LANGUAGE plpgsql;

-- Функция для отзыва карты с казино
CREATE OR REPLACE FUNCTION unassign_card_from_casino(
  p_card_id UUID,
  p_casino_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_assignment_exists BOOLEAN;
  v_has_deposit BOOLEAN;
BEGIN
  -- Проверяем существование назначения
  SELECT EXISTS(
    SELECT 1 FROM card_casino_assignments 
    WHERE card_id = p_card_id AND casino_id = p_casino_id AND status = 'active'
  ) INTO v_assignment_exists;
  
  IF NOT v_assignment_exists THEN
    RETURN json_build_object('success', false, 'error', 'Назначение не найдено');
  END IF;
  
  -- Проверяем есть ли депозит (если есть - нельзя отзывать)
  SELECT EXISTS(
    SELECT 1 FROM card_casino_assignments 
    WHERE card_id = p_card_id AND casino_id = p_casino_id AND deposit_amount IS NOT NULL
  ) INTO v_has_deposit;
  
  IF v_has_deposit THEN
    RETURN json_build_object('success', false, 'error', 'Нельзя отозвать карту после депозита');
  END IF;
  
  -- Отзываем назначение
  UPDATE card_casino_assignments 
  SET status = 'cancelled', updated_at = NOW()
  WHERE card_id = p_card_id AND casino_id = p_casino_id AND status = 'active';
  
  RETURN json_build_object('success', true, 'message', 'Карта отозвана с казино');
END;
$$ LANGUAGE plpgsql;

-- Отключаем RLS для новой таблицы
ALTER TABLE card_casino_assignments DISABLE ROW LEVEL SECURITY;

-- Комментарии
COMMENT ON TABLE card_casino_assignments IS 'Назначения карт на казино (многие ко многим)';
COMMENT ON COLUMN card_casino_assignments.assignment_type IS 'Тип назначения: testing (тестировщик), work (для Junior)';
COMMENT ON COLUMN card_casino_assignments.status IS 'Статус: active, completed, cancelled';
