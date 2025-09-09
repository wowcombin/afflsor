-- Обновление системы расчета зарплат согласно новой схеме распределения доходов
-- Дата: 2024-01-XX
-- ВАЖНО: Этот файл должен выполняться ПОСЛЕ 015_add_new_roles.sql

-- 1. Обновляем функцию расчета зарплат
CREATE OR REPLACE FUNCTION calculate_monthly_salaries_v2(
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
  is_month_leader BOOLEAN,
  notes TEXT
) AS $$
DECLARE
  total_all DECIMAL(10,2); -- ALL = сумма всех профитов джунов + профит Manual QA
  total_expenses_amount DECIMAL(10,2);
  expense_percent DECIMAL(5,2);
  qa_assistant_salary DECIMAL(10,2) := 1000.00; -- Фиксированная зарплата QA Assistant
  use_percentage_calculation BOOLEAN; -- Условие: Spending < 20% от ALL
  leader_record RECORD;
  total_role_payments DECIMAL(10,2) := 0;
  ceo_salary DECIMAL(10,2) := 0;
BEGIN
  -- 1. Получаем ALL = сумма всех профитов джунов + профит Manual QA
  WITH junior_profits AS (
    SELECT 
      u.id,
      COALESCE(SUM(ww.withdrawal_amount - w.deposit_amount), 0) as profit
    FROM users u
    LEFT JOIN works w ON w.junior_id = u.id 
      AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
      AND w.status = 'completed'
    LEFT JOIN work_withdrawals ww ON ww.work_id = w.id 
      AND ww.status = 'received'
    WHERE u.role IN ('junior', 'tester') -- tester = Manual QA
      AND u.status = 'active'
    GROUP BY u.id
  )
  SELECT COALESCE(SUM(profit), 0) INTO total_all
  FROM junior_profits;

  -- 2. Получаем общие расходы за месяц (включая QA Assistant)
  SELECT COALESCE(SUM(e.amount), 0) + qa_assistant_salary INTO total_expenses_amount
  FROM expenses e
  WHERE DATE_TRUNC('month', e.expense_date) = (p_month || '-01')::DATE
    AND e.status = 'approved';

  -- 3. Вычисляем процент расходов
  IF total_all > 0 THEN
    expense_percent := (total_expenses_amount / total_all) * 100;
  ELSE
    expense_percent := 0;
  END IF;

  -- 4. Определяем условие для процентных выплат (Spending < 20%)
  use_percentage_calculation := expense_percent < 20;

  -- 5. Определяем лидера месяца (самый крупный аккаунт среди всех Junior)
  SELECT 
    u.id as employee_id,
    MAX(w.deposit_amount) as largest_profit
  INTO leader_record
  FROM users u
  JOIN works w ON w.junior_id = u.id
  WHERE u.role = 'junior'
    AND u.status = 'active'
    AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
    AND w.status = 'completed'
  GROUP BY u.id
  ORDER BY largest_profit DESC
  LIMIT 1;

  -- 6. Возвращаем результаты расчета для каждого сотрудника
  RETURN QUERY
  WITH employee_profits AS (
    SELECT 
      u.id,
      CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as name,
      u.role,
      -- Индивидуальный профит сотрудника
      CASE 
        WHEN u.role IN ('junior', 'tester') THEN
          COALESCE(SUM(ww.withdrawal_amount - w.deposit_amount), 0)
        ELSE 0
      END as individual_profit,
      -- Профит команды для Team Lead
      CASE 
        WHEN u.role = 'teamlead' THEN
          COALESCE((
            SELECT SUM(ww2.withdrawal_amount - w2.deposit_amount)
            FROM users u2
            JOIN works w2 ON w2.user_id = u2.id
            JOIN work_withdrawals ww2 ON ww2.work_id = w2.id
            WHERE u2.team_lead_id = u.id
              AND u2.role = 'junior'
              AND u2.status = 'active'
              AND DATE_TRUNC('month', w2.created_at) = (p_month || '-01')::DATE
              AND w2.status = 'completed'
              AND ww2.status = 'received'
          ), 0)
        ELSE 0
      END as team_profit
    FROM users u
    LEFT JOIN works w ON w.junior_id = u.id 
      AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
      AND w.status = 'completed'
    LEFT JOIN work_withdrawals ww ON ww.work_id = w.id 
      AND ww.status = 'received'
    WHERE u.status = 'active'
    GROUP BY u.id, u.first_name, u.last_name, u.role
  ),
  salary_calculations AS (
    SELECT 
      ep.*,
      total_all,
      total_expenses_amount,
      expense_percent,
      use_percentage_calculation,
      -- Расчет базовой зарплаты по ролям
      CASE 
        -- Junior: 10% от своего профита
        WHEN ep.role = 'junior' THEN 
          (ep.individual_profit * 0.10)
        -- Team Lead: 10% от профита команды
        WHEN ep.role = 'teamlead' THEN 
          (ep.team_profit * 0.10)
        -- Coordinator (Manager): 10% от ALL при условии
        WHEN ep.role = 'manager' THEN 
          CASE WHEN use_percentage_calculation THEN (total_all * 0.10) ELSE 0 END
        -- HR: 5% от ALL при условии
        WHEN ep.role = 'hr' THEN 
          CASE WHEN use_percentage_calculation THEN (total_all * 0.05) ELSE 0 END
        -- CFO: 5% от ALL при условии
        WHEN ep.role = 'cfo' THEN 
          CASE WHEN use_percentage_calculation THEN (total_all * 0.05) ELSE 0 END
        -- Manual QA (Tester): 10% от ALL при условии
        WHEN ep.role = 'tester' THEN 
          CASE WHEN use_percentage_calculation THEN (total_all * 0.10) ELSE 0 END
        -- QA Assistant: фиксированная зарплата
        WHEN ep.role = 'qa_assistant' THEN 
          qa_assistant_salary
        -- CEO: рассчитывается отдельно в конце
        WHEN ep.role = 'ceo' THEN 0
        ELSE 0
      END as base_sal,
      -- Бонусы для Junior
      CASE 
        WHEN ep.role = 'junior' THEN
          -- Бонус $200 при профите >= $2000
          CASE WHEN ep.individual_profit >= 2000 THEN 200.00 ELSE 0.00 END +
          -- Бонус 20% при профите > $7000
          CASE WHEN ep.individual_profit > 7000 THEN (ep.individual_profit - 7000) * 0.20 ELSE 0.00 END
        ELSE 0.00
      END as perf_bonus,
      -- Лидерский бонус (10% от самого большого аккаунта)
      CASE 
        WHEN ep.role = 'junior' AND ep.id = leader_record.employee_id THEN 
          (leader_record.largest_profit * 0.10)
        ELSE 0.00
      END as leader_bon
    FROM employee_profits ep
    CROSS JOIN (VALUES (total_all, total_expenses_amount, expense_percent, use_percentage_calculation)) 
      AS totals(total_all, total_expenses_amount, expense_percent, use_percentage_calculation)
  )
  SELECT 
    sc.id::UUID,
    sc.name::TEXT,
    sc.role::VARCHAR(50),
    CASE WHEN sc.role IN ('junior', 'tester') THEN sc.individual_profit ELSE total_all END::DECIMAL(10,2) as gross_profit,
    sc.total_expenses_amount::DECIMAL(10,2),
    (sc.total_all - sc.total_expenses_amount)::DECIMAL(10,2) as net_profit,
    sc.expense_percent::DECIMAL(5,2),
    CASE WHEN sc.use_percentage_calculation THEN 'percentage' ELSE 'fixed' END::VARCHAR(20) as calc_method,
    sc.base_sal::DECIMAL(10,2),
    sc.perf_bonus::DECIMAL(10,2),
    sc.leader_bon::DECIMAL(10,2),
    (sc.base_sal + sc.perf_bonus + sc.leader_bon)::DECIMAL(10,2) as total_sal,
    (sc.role = 'junior' AND sc.id = leader_record.employee_id)::BOOLEAN as is_leader,
    CASE 
      WHEN sc.role IN ('manager', 'hr', 'cfo', 'tester') AND NOT sc.use_percentage_calculation THEN
        'Зарплата = 0 (расходы >= 20% от общего профита)'
      WHEN sc.role = 'ceo' THEN
        'CEO зарплата рассчитывается как остаток после всех выплат'
      ELSE ''
    END::TEXT as notes
  FROM salary_calculations sc
  WHERE sc.role != 'ceo' -- CEO рассчитываем отдельно

  UNION ALL

  -- Расчет для CEO (остаток после всех выплат)
  SELECT 
    (SELECT id FROM users WHERE role = 'ceo' AND status = 'active' LIMIT 1)::UUID,
    (SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) FROM users WHERE role = 'ceo' AND status = 'active' LIMIT 1)::TEXT,
    'ceo'::VARCHAR(50),
    total_all::DECIMAL(10,2),
    total_expenses_amount::DECIMAL(10,2),
    (total_all - total_expenses_amount)::DECIMAL(10,2),
    expense_percent::DECIMAL(5,2),
    'remainder'::VARCHAR(20),
    -- CEO зарплата = ALL - (Spending + все выплаты ролям)
    (
      total_all - total_expenses_amount - (
        SELECT COALESCE(SUM(sc2.base_sal + sc2.perf_bonus + sc2.leader_bon), 0)
        FROM (
          SELECT 
            CASE 
              WHEN u.role = 'junior' THEN 
                (COALESCE(individual_profits.profit, 0) * 0.10) +
                CASE WHEN COALESCE(individual_profits.profit, 0) >= 2000 THEN 200.00 ELSE 0.00 END +
                CASE WHEN COALESCE(individual_profits.profit, 0) > 7000 THEN (COALESCE(individual_profits.profit, 0) - 7000) * 0.20 ELSE 0.00 END +
                CASE WHEN u.id = leader_record.employee_id THEN (leader_record.largest_profit * 0.10) ELSE 0.00 END
              WHEN u.role = 'teamlead' THEN 
                COALESCE(team_profits.profit, 0) * 0.10
              WHEN u.role = 'manager' AND use_percentage_calculation THEN 
                total_all * 0.10
              WHEN u.role = 'hr' AND use_percentage_calculation THEN 
                total_all * 0.05
              WHEN u.role = 'cfo' AND use_percentage_calculation THEN 
                total_all * 0.05
              WHEN u.role = 'tester' AND use_percentage_calculation THEN 
                total_all * 0.10
              WHEN u.role = 'qa_assistant' THEN 
                qa_assistant_salary
              ELSE 0
            END as base_sal,
            0 as perf_bonus,
            0 as leader_bon
          FROM users u
          LEFT JOIN (
            SELECT 
              u2.id,
              COALESCE(SUM(ww.withdrawal_amount - w.deposit_amount), 0) as profit
            FROM users u2
            LEFT JOIN works w ON w.user_id = u2.id 
              AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
              AND w.status = 'completed'
            LEFT JOIN work_withdrawals ww ON ww.work_id = w.id 
              AND ww.status = 'received'
            WHERE u2.role IN ('junior', 'tester')
            GROUP BY u2.id
          ) individual_profits ON individual_profits.id = u.id
          LEFT JOIN (
            SELECT 
              tl.id,
              COALESCE(SUM(ww2.withdrawal_amount - w2.deposit_amount), 0) as profit
            FROM users tl
            LEFT JOIN users j ON j.team_lead_id = tl.id AND j.role = 'junior' AND j.status = 'active'
            LEFT JOIN works w2 ON w2.junior_id = j.id 
              AND DATE_TRUNC('month', w2.created_at) = (p_month || '-01')::DATE
              AND w2.status = 'completed'
            LEFT JOIN work_withdrawals ww2 ON ww2.work_id = w2.id 
              AND ww2.status = 'received'
            WHERE tl.role = 'teamlead'
            GROUP BY tl.id
          ) team_profits ON team_profits.id = u.id
          WHERE u.status = 'active' AND u.role != 'ceo'
        ) sc2
      )
    )::DECIMAL(10,2) as base_sal,
    0.00::DECIMAL(10,2) as perf_bonus,
    0.00::DECIMAL(10,2) as leader_bon,
    (
      total_all - total_expenses_amount - (
        SELECT COALESCE(SUM(sc3.total_salary), 0)
        FROM (
          SELECT 
            CASE 
              WHEN u.role = 'junior' THEN 
                (COALESCE(individual_profits.profit, 0) * 0.10) +
                CASE WHEN COALESCE(individual_profits.profit, 0) >= 2000 THEN 200.00 ELSE 0.00 END +
                CASE WHEN COALESCE(individual_profits.profit, 0) > 7000 THEN (COALESCE(individual_profits.profit, 0) - 7000) * 0.20 ELSE 0.00 END +
                CASE WHEN u.id = leader_record.employee_id THEN (leader_record.largest_profit * 0.10) ELSE 0.00 END
              WHEN u.role = 'teamlead' THEN 
                COALESCE(team_profits.profit, 0) * 0.10
              WHEN u.role = 'manager' AND use_percentage_calculation THEN 
                total_all * 0.10
              WHEN u.role = 'hr' AND use_percentage_calculation THEN 
                total_all * 0.05
              WHEN u.role = 'cfo' AND use_percentage_calculation THEN 
                total_all * 0.05
              WHEN u.role = 'tester' AND use_percentage_calculation THEN 
                total_all * 0.10
              WHEN u.role = 'qa_assistant' THEN 
                qa_assistant_salary
              ELSE 0
            END as total_salary
          FROM users u
          LEFT JOIN (
            SELECT 
              u2.id,
              COALESCE(SUM(ww.withdrawal_amount - w.deposit_amount), 0) as profit
            FROM users u2
            LEFT JOIN works w ON w.user_id = u2.id 
              AND DATE_TRUNC('month', w.created_at) = (p_month || '-01')::DATE
              AND w.status = 'completed'
            LEFT JOIN work_withdrawals ww ON ww.work_id = w.id 
              AND ww.status = 'received'
            WHERE u2.role IN ('junior', 'tester')
            GROUP BY u2.id
          ) individual_profits ON individual_profits.id = u.id
          LEFT JOIN (
            SELECT 
              tl.id,
              COALESCE(SUM(ww2.withdrawal_amount - w2.deposit_amount), 0) as profit
            FROM users tl
            LEFT JOIN users j ON j.team_lead_id = tl.id AND j.role = 'junior' AND j.status = 'active'
            LEFT JOIN works w2 ON w2.junior_id = j.id 
              AND DATE_TRUNC('month', w2.created_at) = (p_month || '-01')::DATE
              AND w2.status = 'completed'
            LEFT JOIN work_withdrawals ww2 ON ww2.work_id = w2.id 
              AND ww2.status = 'received'
            WHERE tl.role = 'teamlead'
            GROUP BY tl.id
          ) team_profits ON team_profits.id = u.id
          WHERE u.status = 'active' AND u.role != 'ceo'
        ) sc3
      )
    )::DECIMAL(10,2) as total_sal,
    FALSE::BOOLEAN as is_leader,
    'Остаток после всех выплат и расходов'::TEXT as notes
  FROM (VALUES (total_all, total_expenses_amount, expense_percent, use_percentage_calculation)) 
    AS ceo_calc(total_all, total_expenses_amount, expense_percent, use_percentage_calculation)
  WHERE EXISTS (SELECT 1 FROM users WHERE role = 'ceo' AND status = 'active');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Создаем представление для удобного просмотра новой системы зарплат
CREATE OR REPLACE VIEW salary_summary_v2 AS
SELECT 
  u.id,
  u.email,
  CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as full_name,
  u.role,
  u.status,
  u.salary_percentage,
  u.salary_bonus,
  CASE 
    WHEN u.role = 'junior' THEN 'Индивидуальный профит × 10% + бонусы'
    WHEN u.role = 'teamlead' THEN 'Профит команды × 10%'
    WHEN u.role = 'manager' THEN 'ALL × 10% (при расходах < 20%)'
    WHEN u.role = 'hr' THEN 'ALL × 5% (при расходах < 20%)'
    WHEN u.role = 'cfo' THEN 'ALL × 5% (при расходах < 20%)'
    WHEN u.role = 'tester' THEN 'ALL × 10% (при расходах < 20%)'
    WHEN u.role = 'qa_assistant' THEN 'Фиксированная $1000'
    WHEN u.role = 'ceo' THEN 'Остаток после всех выплат'
    ELSE 'Не определено'
  END as salary_formula,
  u.created_at
FROM users u
WHERE u.status = 'active'
ORDER BY 
  CASE u.role
    WHEN 'ceo' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'cfo' THEN 3
    WHEN 'hr' THEN 4
    WHEN 'teamlead' THEN 5
    WHEN 'tester' THEN 6
    WHEN 'junior' THEN 7
    WHEN 'qa_assistant' THEN 8
    ELSE 9
  END,
  u.email;

-- 3. Комментарии к обновлениям
COMMENT ON FUNCTION calculate_monthly_salaries_v2 IS 'Обновленная функция расчета зарплат согласно новой схеме распределения доходов';
COMMENT ON VIEW salary_summary_v2 IS 'Сводка по формулам расчета зарплат для всех ролей';

-- 4. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_works_junior_created_status ON works(junior_id, created_at, status);
CREATE INDEX IF NOT EXISTS idx_work_withdrawals_work_status ON work_withdrawals(work_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_date_status ON expenses(expense_date, status);

-- 5. Права доступа
GRANT EXECUTE ON FUNCTION calculate_monthly_salaries_v2 TO authenticated;
GRANT SELECT ON salary_summary_v2 TO authenticated;
