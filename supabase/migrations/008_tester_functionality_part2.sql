-- ЧАСТЬ 2: Создание таблиц и остальной функциональности
-- Выполните эту часть после успешного выполнения части 1

-- Обновление таблицы казино (если еще не существует)
CREATE TABLE IF NOT EXISTS casinos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  url VARCHAR(255),
  status casino_status NOT NULL DEFAULT 'pending',
  allowed_bins TEXT[],
  manual TEXT,
  auto_approve_limit NUMERIC(10,2) DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица тестов казино
CREATE TABLE casino_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES users(id),
  status test_status NOT NULL DEFAULT 'pending',
  registration_time INTEGER, -- время регистрации в секундах
  deposit_success BOOLEAN DEFAULT FALSE,
  withdrawal_time INTEGER, -- время вывода в секундах
  issues_found TEXT[], -- массив найденных проблем
  recommended_bins TEXT[], -- рекомендуемые BIN коды
  test_result VARCHAR(20) CHECK (test_result IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Таблица мануалов казино
CREATE TABLE casino_manuals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(casino_id, version)
);

-- Индексы для производительности
CREATE INDEX idx_casino_tests_tester ON casino_tests(tester_id, status);
CREATE INDEX idx_casino_tests_casino ON casino_tests(casino_id, status);
CREATE INDEX idx_casino_manuals_casino ON casino_manuals(casino_id, is_published);
CREATE INDEX idx_casinos_status ON casinos(status);

-- Триггер для обновления updated_at в casinos
CREATE OR REPLACE FUNCTION update_casino_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_casinos_updated_at
  BEFORE UPDATE ON casinos
  FOR EACH ROW
  EXECUTE FUNCTION update_casino_updated_at();

-- Функция для автоматического обновления статуса казино после теста
CREATE OR REPLACE FUNCTION update_casino_status_after_test()
RETURNS TRIGGER AS $$
BEGIN
  -- Если тест завершен, обновляем статус казино
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE casinos 
    SET status = CASE 
      WHEN NEW.test_result = 'approved' THEN 'approved'::casino_status
      WHEN NEW.test_result = 'rejected' THEN 'rejected'::casino_status
      ELSE status
    END,
    updated_at = NOW()
    WHERE id = NEW.casino_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_casino_status
  AFTER UPDATE ON casino_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_casino_status_after_test();

-- Представление для активных тестов
CREATE OR REPLACE VIEW active_casino_tests AS
SELECT 
  ct.*,
  c.name as casino_name,
  c.url as casino_url,
  u.first_name || ' ' || u.last_name as tester_name
FROM casino_tests ct
JOIN casinos c ON c.id = ct.casino_id
JOIN users u ON u.id = ct.tester_id
WHERE ct.status IN ('pending', 'in_progress');

-- Представление для статистики тестера
CREATE OR REPLACE VIEW tester_statistics AS
SELECT 
  u.id as tester_id,
  u.first_name || ' ' || u.last_name as tester_name,
  COUNT(ct.id) as total_tests,
  COUNT(CASE WHEN ct.status = 'completed' THEN 1 END) as completed_tests,
  COUNT(CASE WHEN ct.test_result = 'approved' THEN 1 END) as approved_tests,
  COUNT(CASE WHEN ct.test_result = 'rejected' THEN 1 END) as rejected_tests,
  AVG(CASE WHEN ct.registration_time IS NOT NULL THEN ct.registration_time END) as avg_registration_time,
  AVG(CASE WHEN ct.withdrawal_time IS NOT NULL THEN ct.withdrawal_time END) as avg_withdrawal_time
FROM users u
LEFT JOIN casino_tests ct ON ct.tester_id = u.id
WHERE u.role = 'tester' AND u.status = 'active'
GROUP BY u.id, u.first_name, u.last_name;
