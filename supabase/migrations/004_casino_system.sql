-- Миграция 004: Система казино и тестирования

-- Создаем типы для казино
CREATE TYPE casino_status AS ENUM ('new', 'testing', 'approved', 'rejected', 'maintenance', 'blocked');
CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Таблица казино
CREATE TABLE casinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  status casino_status DEFAULT 'new',
  allowed_bins TEXT[], -- Массив разрешенных BIN кодов
  auto_approve_limit NUMERIC(10,2) DEFAULT 0.00, -- Лимит автоодобрения выводов
  withdrawal_time_value INTEGER DEFAULT 0, -- Время вывода (значение)
  withdrawal_time_unit VARCHAR(20) DEFAULT 'instant', -- Единица времени (instant, minutes, hours)
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица мануалов казино
CREATE TABLE casino_manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица тестов казино
CREATE TABLE casino_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES users(id),
  card_id UUID REFERENCES cards(id), -- Карта использованная для теста
  test_type VARCHAR(50) NOT NULL DEFAULT 'full', -- full, deposit_only, withdrawal_only
  status test_status DEFAULT 'pending',
  
  -- Данные теста
  registration_time INTEGER, -- Время регистрации в секундах
  deposit_amount NUMERIC(10,2),
  deposit_success BOOLEAN,
  deposit_time INTEGER, -- Время депозита в секундах
  
  withdrawal_amount NUMERIC(10,2),
  withdrawal_success BOOLEAN,
  withdrawal_time INTEGER, -- Время вывода в секундах
  
  -- Результаты
  issues_found TEXT[], -- Массив найденных проблем
  recommended_bins TEXT[], -- Рекомендуемые BIN коды
  test_result VARCHAR(20), -- approved, rejected, needs_review
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  
  -- Заметки и отчет
  test_notes TEXT,
  final_report TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории изменений BIN кодов казино
CREATE TABLE casino_bin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  old_bins TEXT[],
  new_bins TEXT[],
  changed_by UUID NOT NULL REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_casinos_status ON casinos(status);
CREATE INDEX idx_casinos_created_by ON casinos(created_by);
CREATE INDEX idx_casinos_name ON casinos(name);

CREATE INDEX idx_casino_manuals_casino_id ON casino_manuals(casino_id);
CREATE INDEX idx_casino_manuals_is_published ON casino_manuals(is_published);
CREATE INDEX idx_casino_manuals_version ON casino_manuals(version);

CREATE INDEX idx_casino_tests_casino_id ON casino_tests(casino_id);
CREATE INDEX idx_casino_tests_tester_id ON casino_tests(tester_id);
CREATE INDEX idx_casino_tests_status ON casino_tests(status);
CREATE INDEX idx_casino_tests_test_result ON casino_tests(test_result);

CREATE INDEX idx_casino_bin_history_casino_id ON casino_bin_history(casino_id);
CREATE INDEX idx_casino_bin_history_changed_by ON casino_bin_history(changed_by);

-- Триггеры для updated_at
CREATE TRIGGER update_casinos_updated_at 
    BEFORE UPDATE ON casinos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casino_manuals_updated_at 
    BEFORE UPDATE ON casino_manuals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casino_tests_updated_at 
    BEFORE UPDATE ON casino_tests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для получения статистики тестирования
CREATE OR REPLACE FUNCTION get_tester_statistics(p_tester_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_tests BIGINT,
  completed_tests BIGINT,
  pending_tests BIGINT,
  success_rate NUMERIC,
  avg_rating NUMERIC,
  total_casinos BIGINT,
  approved_casinos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tests,
    COUNT(CASE WHEN ct.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN ct.status = 'pending' THEN 1 END) as pending_tests,
    CASE 
      WHEN COUNT(CASE WHEN ct.status = 'completed' THEN 1 END) > 0 
      THEN ROUND(
        COUNT(CASE WHEN ct.test_result = 'approved' THEN 1 END)::NUMERIC / 
        COUNT(CASE WHEN ct.status = 'completed' THEN 1 END)::NUMERIC * 100, 2
      )
      ELSE 0
    END as success_rate,
    COALESCE(AVG(ct.rating), 0) as avg_rating,
    COUNT(DISTINCT ct.casino_id) as total_casinos,
    COUNT(DISTINCT CASE WHEN ct.test_result = 'approved' THEN ct.casino_id END) as approved_casinos
  FROM casino_tests ct
  WHERE (p_tester_id IS NULL OR ct.tester_id = p_tester_id);
END;
$$ LANGUAGE plpgsql;

-- Представление для активных тестов
CREATE VIEW active_casino_tests AS
SELECT 
  ct.id,
  ct.test_type,
  ct.status,
  ct.started_at,
  ct.created_at,
  c.id as casino_id,
  c.name as casino_name,
  c.url as casino_url,
  c.status as casino_status,
  u.first_name as tester_first_name,
  u.last_name as tester_last_name,
  u.email as tester_email,
  cards.card_number_mask,
  cards.card_bin
FROM casino_tests ct
JOIN casinos c ON ct.casino_id = c.id
JOIN users u ON ct.tester_id = u.id
LEFT JOIN cards ON ct.card_id = cards.id
WHERE ct.status IN ('pending', 'in_progress')
ORDER BY ct.created_at DESC;

-- Представление для казино с последними тестами
CREATE VIEW casinos_with_latest_test AS
SELECT 
  c.id,
  c.name,
  c.url,
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
ORDER BY c.created_at DESC;

-- Отключаем RLS для новых таблиц (для простоты)
ALTER TABLE casinos DISABLE ROW LEVEL SECURITY;
ALTER TABLE casino_manuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE casino_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE casino_bin_history DISABLE ROW LEVEL SECURITY;

-- Комментарии к таблицам
COMMENT ON TABLE casinos IS 'Казино для тестирования и работы';
COMMENT ON TABLE casino_manuals IS 'Мануалы по работе с казино';
COMMENT ON TABLE casino_tests IS 'Тесты казино проводимые Tester';
COMMENT ON TABLE casino_bin_history IS 'История изменений разрешенных BIN кодов';

COMMENT ON COLUMN casinos.allowed_bins IS 'Массив разрешенных BIN кодов для карт';
COMMENT ON COLUMN casinos.auto_approve_limit IS 'Лимит автоматического одобрения выводов';
COMMENT ON COLUMN casino_tests.issues_found IS 'Массив найденных проблем при тестировании';
COMMENT ON COLUMN casino_tests.recommended_bins IS 'Рекомендуемые BIN коды по результатам теста';

-- Вставляем тестовые казино
INSERT INTO casinos (name, url, status, allowed_bins, auto_approve_limit, created_by) VALUES
('Test Casino 1', 'https://testcasino1.com', 'new', ARRAY['123456', '654321'], 100.00, (SELECT id FROM users WHERE role = 'tester' LIMIT 1)),
('Test Casino 2', 'https://testcasino2.com', 'testing', ARRAY['111111', '222222'], 200.00, (SELECT id FROM users WHERE role = 'tester' LIMIT 1)),
('Test Casino 3', 'https://testcasino3.com', 'approved', ARRAY['333333', '444444'], 150.00, (SELECT id FROM users WHERE role = 'tester' LIMIT 1));

-- Вставляем тестовые мануалы
INSERT INTO casino_manuals (casino_id, title, content, version, is_published, created_by) 
SELECT 
  c.id,
  'Мануал для ' || c.name,
  '# Инструкция по работе с ' || c.name || E'\n\n## Регистрация\n1. Перейти на ' || c.url || E'\n2. Заполнить форму регистрации\n3. Подтвердить email\n\n## Депозит\n1. Войти в аккаунт\n2. Перейти в раздел "Касса"\n3. Выбрать способ пополнения\n4. Указать сумму и данные карты\n\n## Вывод\n1. Перейти в раздел "Вывод"\n2. Указать сумму\n3. Ввести реквизиты\n4. Подтвердить операцию',
  1,
  true,
  (SELECT id FROM users WHERE role = 'tester' LIMIT 1)
FROM casinos c;

-- Вставляем тестовые тесты
INSERT INTO casino_tests (casino_id, tester_id, test_type, status, registration_time, deposit_amount, deposit_success, withdrawal_amount, test_result, rating, test_notes)
SELECT 
  c.id,
  (SELECT id FROM users WHERE role = 'tester' LIMIT 1),
  'full',
  'completed',
  CASE WHEN c.name LIKE '%1%' THEN 120 WHEN c.name LIKE '%2%' THEN 90 ELSE 150 END,
  100.00,
  true,
  250.00,
  CASE WHEN c.name LIKE '%3%' THEN 'approved' ELSE 'needs_review' END,
  CASE WHEN c.name LIKE '%1%' THEN 8 WHEN c.name LIKE '%2%' THEN 6 ELSE 9 END,
  'Тестовый отчет для ' || c.name
FROM casinos c;
