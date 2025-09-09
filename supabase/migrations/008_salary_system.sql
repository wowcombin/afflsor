-- Миграция 008: Система расчета зарплат и расходов
-- Реализует двухуровневую схему: 20% правило + система лидеров

-- Создаем таблицу расходов
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  expense_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу для отслеживания лидеров месяца
CREATE TABLE monthly_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  employee_id UUID NOT NULL REFERENCES users(id),
  largest_account_profit DECIMAL(10,2) NOT NULL,
  casino_account_id UUID, -- Ссылка на аккаунт казино
  total_monthly_profit DECIMAL(10,2) NOT NULL,
  bonus_paid DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, employee_id)
);

-- Создаем таблицу для расчета зарплат
CREATE TABLE salary_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  employee_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  
  -- Данные для расчета
  gross_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  expense_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Процент расходов от брутто
  
  -- Расчет зарплаты
  calculation_base DECIMAL(10,2) NOT NULL DEFAULT 0, -- Брутто или нетто
  base_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Процент для роли
  base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Бонусы для Junior
  performance_bonus DECIMAL(10,2) DEFAULT 0, -- $200 при профите ≥ $2000
  leader_bonus DECIMAL(10,2) DEFAULT 0, -- 10% дополнительно для лидера
  is_month_leader BOOLEAN DEFAULT FALSE,
  largest_account_profit DECIMAL(10,2) DEFAULT 0,
  
  -- Итого
  total_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Метаданные
  calculated_by UUID NOT NULL REFERENCES users(id),
  calculation_method VARCHAR(20) NOT NULL CHECK (calculation_method IN ('gross', 'net')), -- Брутто или нетто
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(month, employee_id)
);

-- Создаем функцию для расчета зарплат
CREATE OR REPLACE FUNCTION calculate_monthly_salaries(
  p_month VARCHAR(7),
  p_calculated_by UUID
) RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  role VARCHAR(50),
  gross_profit DECIMAL(10,2),
  total_expenses DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  expense_percentage DECIMAL(5,2),
  calculation_method VARCHAR(20),
  base_salary DECIMAL(10,2),
  performance_bonus DECIMAL(10,2),
  leader_bonus DECIMAL(10,2),
  total_salary DECIMAL(10,2),
  is_month_leader BOOLEAN
) AS $$
DECLARE
  total_gross DECIMAL(10,2);
  total_expenses_amount DECIMAL(10,2);
  expense_percent DECIMAL(5,2);
  use_net_calculation BOOLEAN;
  leader_record RECORD;
BEGIN
  -- 1. Получаем общий брутто профит за месяц
  SELECT COALESCE(SUM(w.deposit_amount), 0) INTO total_gross
  FROM works w
  WHERE DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
    AND w.status = 'completed';

  -- 2. Получаем общие расходы за месяц (только одобренные)
  SELECT COALESCE(SUM(e.amount), 0) INTO total_expenses_amount
  FROM expenses e
  WHERE DATE_TRUNC('month', e.expense_date) = (p_month || '-01')::DATE
    AND e.status = 'approved';

  -- 3. Вычисляем процент расходов
  IF total_gross > 0 THEN
    expense_percent := (total_expenses_amount / total_gross) * 100;
  ELSE
    expense_percent := 0;
  END IF;

  -- 4. Определяем метод расчета (правило 20%)
  use_net_calculation := expense_percent > 20;

  -- 5. Определяем лидера месяца (самый крупный аккаунт среди всех Junior)
  SELECT 
    u.id as employee_id,
    MAX(w.deposit_amount) as largest_profit
  INTO leader_record
  FROM users u
  JOIN works w ON w.user_id = u.id
  WHERE u.role = 'junior'
    AND u.status = 'active'
    AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
    AND w.status = 'completed'
  GROUP BY u.id
  ORDER BY largest_profit DESC
  LIMIT 1;

  -- 6. Сохраняем информацию о лидере
  IF leader_record.employee_id IS NOT NULL THEN
    INSERT INTO monthly_leaders (month, employee_id, largest_account_profit, total_monthly_profit)
    VALUES (p_month, leader_record.employee_id, leader_record.largest_profit, 
            (SELECT COALESCE(SUM(w.deposit_amount), 0) 
             FROM works w 
             WHERE w.user_id = leader_record.employee_id 
               AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
               AND w.status = 'completed'))
    ON CONFLICT (month, employee_id) DO UPDATE SET
      largest_account_profit = EXCLUDED.largest_account_profit,
      total_monthly_profit = EXCLUDED.total_monthly_profit;
  END IF;

  -- 7. Рассчитываем зарплаты для всех ролей
  RETURN QUERY
  WITH employee_profits AS (
    SELECT 
      u.id,
      u.first_name || ' ' || u.last_name as name,
      u.role,
      COALESCE(SUM(w.deposit_amount), 0) as monthly_profit
    FROM users u
    LEFT JOIN works w ON w.user_id = u.id 
      AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
      AND w.status = 'completed'
    WHERE u.status = 'active'
      AND u.role IN ('junior', 'manager', 'hr', 'cfo', 'tester')
    GROUP BY u.id, u.first_name, u.last_name, u.role
  ),
  salary_calculations AS (
    SELECT 
      ep.*,
      total_gross,
      total_expenses_amount,
      (total_gross - total_expenses_amount) as net_profit_calc,
      expense_percent,
      CASE 
        WHEN use_net_calculation THEN (total_gross - total_expenses_amount)
        ELSE total_gross
      END as calculation_base,
      CASE 
        WHEN use_net_calculation THEN 'net'
        ELSE 'gross'
      END as calc_method,
      -- Процент для каждой роли
      CASE 
        WHEN ep.role = 'junior' THEN 10.0
        WHEN ep.role = 'manager' THEN 10.0
        WHEN ep.role = 'hr' THEN 5.0
        WHEN ep.role = 'cfo' THEN 5.0
        WHEN ep.role = 'tester' THEN 10.0
        ELSE 0.0
      END as role_percentage
    FROM employee_profits ep
    CROSS JOIN (VALUES (total_gross, total_expenses_amount, expense_percent)) AS totals(total_gross, total_expenses_amount, expense_percent)
  )
  SELECT 
    sc.id::UUID,
    sc.name::TEXT,
    sc.role::VARCHAR(50),
    sc.total_gross::DECIMAL(10,2),
    sc.total_expenses_amount::DECIMAL(10,2),
    sc.net_profit_calc::DECIMAL(10,2),
    sc.expense_percent::DECIMAL(5,2),
    sc.calc_method::VARCHAR(20),
    -- Базовая зарплата для ролей (кроме Junior - у них своя логика)
    CASE 
      WHEN sc.role = 'junior' THEN (sc.monthly_profit * 0.10)::DECIMAL(10,2)
      ELSE (sc.calculation_base * sc.role_percentage / 100)::DECIMAL(10,2)
    END as base_sal,
    -- Бонус за производительность (только для Junior)
    CASE 
      WHEN sc.role = 'junior' AND sc.monthly_profit >= 2000 THEN 200.00
      ELSE 0.00
    END::DECIMAL(10,2) as perf_bonus,
    -- Лидерский бонус (только для лидера месяца)
    CASE 
      WHEN sc.role = 'junior' AND sc.id = leader_record.employee_id THEN (leader_record.largest_profit * 0.10)
      ELSE 0.00
    END::DECIMAL(10,2) as leader_bon,
    -- Итоговая зарплата
    CASE 
      WHEN sc.role = 'junior' THEN 
        (sc.monthly_profit * 0.10) + 
        CASE WHEN sc.monthly_profit >= 2000 THEN 200.00 ELSE 0.00 END +
        CASE WHEN sc.id = leader_record.employee_id THEN (leader_record.largest_profit * 0.10) ELSE 0.00 END
      ELSE (sc.calculation_base * sc.role_percentage / 100)
    END::DECIMAL(10,2) as total_sal,
    -- Является ли лидером месяца
    (sc.role = 'junior' AND sc.id = leader_record.employee_id)::BOOLEAN as is_leader
  FROM salary_calculations sc;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем представление для удобного просмотра расходов
CREATE VIEW expenses_view AS
SELECT 
  e.*,
  uc.first_name || ' ' || uc.last_name as created_by_name
FROM expenses e
JOIN users uc ON e.created_by = uc.id
ORDER BY e.created_at DESC;

-- Создаем индексы для производительности
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_monthly_leaders_month ON monthly_leaders(month);
CREATE INDEX idx_monthly_leaders_employee ON monthly_leaders(employee_id);
CREATE INDEX idx_salary_calculations_month ON salary_calculations(month);

-- Добавляем RLS политики
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_calculations ENABLE ROW LEVEL SECURITY;

-- Политики для expenses
CREATE POLICY "expenses_select_policy" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (
        SELECT id FROM users 
        WHERE auth_id = auth.uid()
      ) 
      AND users.role IN ('cfo', 'admin', 'hr')
    )
  );

CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = created_by 
      AND users.auth_id = auth.uid()
      AND users.role IN ('cfo', 'admin', 'hr')
    )
  );

-- Политики для monthly_leaders
CREATE POLICY "monthly_leaders_select_policy" ON monthly_leaders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (
        SELECT id FROM users 
        WHERE auth_id = auth.uid()
      ) 
      AND users.role IN ('cfo', 'admin', 'manager', 'junior')
    )
  );

-- Политики для salary_calculations
CREATE POLICY "salary_calculations_select_policy" ON salary_calculations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (
        SELECT id FROM users 
        WHERE auth_id = auth.uid()
      ) 
      AND (
        users.role IN ('cfo', 'admin') OR 
        users.id = salary_calculations.employee_id
      )
    )
  );

-- Добавляем тестовые категории расходов
INSERT INTO expenses (category, description, amount, currency, expense_date, created_by) 
SELECT 
  category,
  description,
  amount,
  'USD',
  CURRENT_DATE - INTERVAL '5 days',
  (SELECT id FROM users WHERE role = 'cfo' LIMIT 1)
FROM (VALUES 
  ('Rendering', 'Услуги рендеринга для видеоконтента', 1500.00),
  ('Documents', 'Оформление документов и лицензий', 800.00),
  ('Banks', 'Банковские комиссии и обслуживание', 450.00),
  ('SMS', 'SMS уведомления и верификация', 120.00),
  ('Телефоны', 'Корпоративная связь и номера', 300.00),
  ('Duoplus', 'Подписка на Duoplus сервисы', 99.00),
  ('Proxy', 'Прокси серверы и VPN услуги', 250.00)
) AS test_expenses(category, description, amount);

-- Создаем функцию для получения статистики расходов
CREATE OR REPLACE FUNCTION get_expenses_statistics(
  p_filter VARCHAR(20) DEFAULT 'all'
) RETURNS TABLE (
  total_expenses BIGINT,
  pending_expenses BIGINT,
  approved_expenses BIGINT,
  rejected_expenses BIGINT,
  total_amount_usd DECIMAL(10,2),
  pending_amount_usd DECIMAL(10,2),
  this_month_amount DECIMAL(10,2),
  last_month_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_exp,
    COUNT(CASE WHEN e.status = 'pending' THEN 1 END)::BIGINT as pending_exp,
    COUNT(CASE WHEN e.status = 'approved' THEN 1 END)::BIGINT as approved_exp,
    COUNT(CASE WHEN e.status = 'rejected' THEN 1 END)::BIGINT as rejected_exp,
    COALESCE(SUM(e.amount), 0)::DECIMAL(10,2) as total_amt,
    COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0)::DECIMAL(10,2) as pending_amt,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', CURRENT_DATE) THEN e.amount ELSE 0 END), 0)::DECIMAL(10,2) as this_month,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN e.amount ELSE 0 END), 0)::DECIMAL(10,2) as last_month
  FROM expenses e
  WHERE (p_filter = 'all' OR e.status = p_filter);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE expenses IS 'Расходы компании с категориями и одобрением';
COMMENT ON TABLE monthly_leaders IS 'Лидеры месяца среди Junior сотрудников';
COMMENT ON TABLE salary_calculations IS 'Расчеты зарплат с двухуровневой системой (20% правило)';
COMMENT ON FUNCTION calculate_monthly_salaries IS 'Функция расчета зарплат по правилу 20% и системе лидеров';
