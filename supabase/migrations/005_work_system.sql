-- Миграция 005: Система рабочих процессов и выводов

-- Создаем типы для работ
CREATE TYPE work_status AS ENUM ('active', 'completed', 'cancelled', 'blocked');
CREATE TYPE withdrawal_status AS ENUM ('new', 'waiting', 'received', 'problem', 'block');

-- Таблица работ (депозитов)
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  junior_id UUID NOT NULL REFERENCES users(id),
  casino_id UUID NOT NULL REFERENCES casinos(id),
  card_id UUID NOT NULL REFERENCES cards(id),
  deposit_amount NUMERIC(10,2) NOT NULL CHECK (deposit_amount > 0),
  status work_status DEFAULT 'active',
  casino_login VARCHAR(100),
  casino_password VARCHAR(100), -- В реальности будет зашифрован
  notes TEXT,
  work_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица выводов
CREATE TABLE work_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  withdrawal_amount NUMERIC(10,2) NOT NULL CHECK (withdrawal_amount > 0),
  status withdrawal_status DEFAULT 'new',
  checked_by UUID REFERENCES users(id), -- Manager который проверил
  checked_at TIMESTAMP WITH TIME ZONE,
  alarm_message TEXT, -- Сообщение при проблеме/блокировке
  manager_notes TEXT, -- Комментарии Manager
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории изменений статусов работ
CREATE TABLE work_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  withdrawal_id UUID REFERENCES work_withdrawals(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID NOT NULL REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_works_junior_id ON works(junior_id);
CREATE INDEX idx_works_casino_id ON works(casino_id);
CREATE INDEX idx_works_card_id ON works(card_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_work_date ON works(work_date);

CREATE INDEX idx_work_withdrawals_work_id ON work_withdrawals(work_id);
CREATE INDEX idx_work_withdrawals_status ON work_withdrawals(status);
CREATE INDEX idx_work_withdrawals_checked_by ON work_withdrawals(checked_by);
CREATE INDEX idx_work_withdrawals_created_at ON work_withdrawals(created_at);

CREATE INDEX idx_work_status_history_work_id ON work_status_history(work_id);
CREATE INDEX idx_work_status_history_withdrawal_id ON work_status_history(withdrawal_id);
CREATE INDEX idx_work_status_history_changed_by ON work_status_history(changed_by);

-- Триггеры для updated_at
CREATE TRIGGER update_works_updated_at 
    BEFORE UPDATE ON works 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_withdrawals_updated_at 
    BEFORE UPDATE ON work_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для безопасной проверки вывода Manager
CREATE OR REPLACE FUNCTION check_withdrawal_safe(
  p_withdrawal_id UUID,
  p_checker_id UUID,
  p_new_status withdrawal_status,
  p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_withdrawal RECORD;
  v_old_status withdrawal_status;
BEGIN
  -- Получаем текущий статус с блокировкой
  SELECT * INTO v_withdrawal
  FROM work_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Вывод не найден';
  END IF;

  v_old_status := v_withdrawal.status;

  -- Проверяем что вывод можно проверить
  IF v_old_status NOT IN ('new', 'waiting') THEN
    RAISE EXCEPTION 'Вывод уже проверен (статус: %)', v_old_status;
  END IF;

  -- Проверяем права проверяющего
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_checker_id 
      AND role IN ('manager', 'admin') 
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Недостаточно прав для проверки выводов';
  END IF;

  -- Обновляем статус
  UPDATE work_withdrawals
  SET 
    status = p_new_status,
    checked_by = p_checker_id,
    checked_at = NOW(),
    manager_notes = p_comment,
    alarm_message = CASE 
      WHEN p_new_status IN ('problem', 'block') THEN p_comment
      ELSE NULL
    END
  WHERE id = p_withdrawal_id;

  -- Логируем изменение
  INSERT INTO work_status_history (
    withdrawal_id,
    work_id,
    old_status,
    new_status,
    changed_by,
    change_reason
  ) VALUES (
    p_withdrawal_id,
    v_withdrawal.work_id,
    v_old_status::VARCHAR,
    p_new_status::VARCHAR,
    p_checker_id,
    p_comment
  );

  -- Если вывод одобрен, завершаем работу
  IF p_new_status = 'received' THEN
    UPDATE works
    SET status = 'completed'
    WHERE id = v_withdrawal.work_id;
  END IF;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка проверки вывода: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Представление для очереди выводов Manager
CREATE VIEW withdrawal_queue AS
SELECT 
  ww.id,
  ww.withdrawal_amount,
  ww.status,
  ww.created_at,
  ww.checked_at,
  ww.alarm_message,
  ww.manager_notes,
  w.id as work_id,
  w.deposit_amount,
  w.work_date,
  w.casino_login,
  w.notes as work_notes,
  (ww.withdrawal_amount - w.deposit_amount) as profit,
  c.name as casino_name,
  c.url as casino_url,
  c.auto_approve_limit,
  cards.card_number_mask,
  cards.card_bin,
  cards.card_type,
  junior.id as junior_id,
  junior.first_name as junior_first_name,
  junior.last_name as junior_last_name,
  junior.email as junior_email,
  manager.first_name as checked_by_first_name,
  manager.last_name as checked_by_last_name,
  -- Время ожидания в минутах
  EXTRACT(EPOCH FROM (NOW() - ww.created_at))/60 as waiting_minutes
FROM work_withdrawals ww
JOIN works w ON ww.work_id = w.id
JOIN casinos c ON w.casino_id = c.id
JOIN cards ON w.card_id = cards.id
JOIN users junior ON w.junior_id = junior.id
LEFT JOIN users manager ON ww.checked_by = manager.id
ORDER BY ww.created_at ASC;

-- Представление для статистики Junior
CREATE VIEW junior_work_stats AS
SELECT 
  w.junior_id,
  COUNT(*) as total_works,
  COUNT(CASE WHEN w.status = 'active' THEN 1 END) as active_works,
  COUNT(CASE WHEN w.status = 'completed' THEN 1 END) as completed_works,
  COALESCE(SUM(w.deposit_amount), 0) as total_deposits,
  COALESCE(SUM(CASE WHEN ww.status = 'received' THEN ww.withdrawal_amount END), 0) as total_withdrawals,
  COALESCE(SUM(CASE WHEN ww.status = 'received' THEN (ww.withdrawal_amount - w.deposit_amount) END), 0) as total_profit,
  COUNT(CASE WHEN ww.status = 'received' THEN 1 END) as successful_withdrawals,
  COUNT(CASE WHEN ww.status IN ('problem', 'block') THEN 1 END) as failed_withdrawals,
  CASE 
    WHEN COUNT(ww.id) > 0 
    THEN ROUND(COUNT(CASE WHEN ww.status = 'received' THEN 1 END)::NUMERIC / COUNT(ww.id)::NUMERIC * 100, 2)
    ELSE 0
  END as success_rate
FROM works w
LEFT JOIN work_withdrawals ww ON w.id = ww.work_id
GROUP BY w.junior_id;

-- Функция для получения статистики по выводам
CREATE OR REPLACE FUNCTION get_withdrawal_statistics(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_withdrawals BIGINT,
  pending_withdrawals BIGINT,
  approved_withdrawals BIGINT,
  rejected_withdrawals BIGINT,
  total_profit NUMERIC,
  avg_processing_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_withdrawals,
    COUNT(CASE WHEN ww.status IN ('new', 'waiting') THEN 1 END) as pending_withdrawals,
    COUNT(CASE WHEN ww.status = 'received' THEN 1 END) as approved_withdrawals,
    COUNT(CASE WHEN ww.status IN ('problem', 'block') THEN 1 END) as rejected_withdrawals,
    COALESCE(SUM(CASE WHEN ww.status = 'received' THEN (ww.withdrawal_amount - w.deposit_amount) END), 0) as total_profit,
    COALESCE(AVG(CASE WHEN ww.checked_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ww.checked_at - ww.created_at))/60 END), 0) as avg_processing_time
  FROM work_withdrawals ww
  JOIN works w ON ww.work_id = w.id
  WHERE (p_user_id IS NULL OR w.junior_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Отключаем RLS для новых таблиц
ALTER TABLE works DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_status_history DISABLE ROW LEVEL SECURITY;

-- Комментарии к таблицам
COMMENT ON TABLE works IS 'Рабочие процессы (депозиты) Junior';
COMMENT ON TABLE work_withdrawals IS 'Выводы средств по работам';
COMMENT ON TABLE work_status_history IS 'История изменений статусов работ и выводов';

COMMENT ON FUNCTION check_withdrawal_safe IS 'Безопасная проверка вывода Manager с блокировкой';
COMMENT ON VIEW withdrawal_queue IS 'Очередь выводов для Manager';
COMMENT ON VIEW junior_work_stats IS 'Статистика работ Junior';

-- Сначала назначаем карты Junior пользователю для тестовых данных
DO $$
DECLARE
  v_junior_id UUID;
  v_card_id UUID;
BEGIN
  -- Получаем ID Junior пользователя
  SELECT id INTO v_junior_id FROM users WHERE role = 'junior' LIMIT 1;
  
  IF v_junior_id IS NOT NULL THEN
    -- Назначаем первую доступную карту Junior
    SELECT id INTO v_card_id 
    FROM cards 
    WHERE assigned_to IS NULL 
      AND status = 'active' 
    LIMIT 1;
    
    IF v_card_id IS NOT NULL THEN
      UPDATE cards 
      SET assigned_to = v_junior_id, 
          assigned_at = NOW()
      WHERE id = v_card_id;
      
      -- Логируем назначение
      INSERT INTO card_assignments (card_id, user_id, assigned_by, status, notes)
      VALUES (v_card_id, v_junior_id, v_junior_id, 'active', 'Автоматическое назначение для тестовых данных');
    END IF;
  END IF;
END $$;

-- Вставляем тестовые работы только если есть назначенные карты
INSERT INTO works (junior_id, casino_id, card_id, deposit_amount, status, casino_login, notes)
SELECT 
  (SELECT id FROM users WHERE role = 'junior' LIMIT 1) as junior_id,
  c.id,
  (SELECT id FROM cards WHERE assigned_to = (SELECT id FROM users WHERE role = 'junior' LIMIT 1) LIMIT 1) as card_id,
  CASE WHEN c.name LIKE '%1%' THEN 100.00 WHEN c.name LIKE '%2%' THEN 150.00 ELSE 200.00 END,
  'active',
  'testuser' || (ROW_NUMBER() OVER()),
  'Тестовая работа с ' || c.name
FROM casinos c
WHERE c.status = 'approved'
  AND EXISTS (SELECT 1 FROM cards WHERE assigned_to = (SELECT id FROM users WHERE role = 'junior' LIMIT 1))
LIMIT 2;

-- Вставляем тестовые выводы
INSERT INTO work_withdrawals (work_id, withdrawal_amount, status, checked_by, checked_at, manager_notes)
SELECT 
  w.id,
  w.deposit_amount + (w.deposit_amount * 0.5), -- Профит 50%
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'waiting'::withdrawal_status
    ELSE 'received'::withdrawal_status
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() > 1 THEN (SELECT id FROM users WHERE role = 'manager' LIMIT 1)
    ELSE NULL
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() > 1 THEN NOW() - INTERVAL '1 hour'
    ELSE NULL
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() > 1 THEN 'Одобрено автоматически'
    ELSE NULL
  END
FROM works w;
