-- Система статистики по командам и успеваемости
-- Миграция 042: Статистика команд и Junior'ов

-- Создание таблицы ежедневной статистики команд
CREATE TABLE team_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    team_lead_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Статистика команды за день
    juniors_count INTEGER DEFAULT 0,
    active_juniors_count INTEGER DEFAULT 0,
    
    -- Работы с картами
    card_works_created INTEGER DEFAULT 0,
    card_works_completed INTEGER DEFAULT 0,
    card_total_deposits DECIMAL(10,2) DEFAULT 0,
    card_total_withdrawals DECIMAL(10,2) DEFAULT 0,
    card_total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Работы с PayPal
    paypal_works_created INTEGER DEFAULT 0,
    paypal_works_completed INTEGER DEFAULT 0,
    paypal_total_deposits DECIMAL(10,2) DEFAULT 0,
    paypal_total_withdrawals DECIMAL(10,2) DEFAULT 0,
    paypal_total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Общая статистика
    total_works_created INTEGER GENERATED ALWAYS AS (card_works_created + paypal_works_created) STORED,
    total_works_completed INTEGER GENERATED ALWAYS AS (card_works_completed + paypal_works_completed) STORED,
    total_deposits DECIMAL(10,2) GENERATED ALWAYS AS (card_total_deposits + paypal_total_deposits) STORED,
    total_withdrawals DECIMAL(10,2) GENERATED ALWAYS AS (card_total_withdrawals + paypal_total_withdrawals) STORED,
    total_profit DECIMAL(10,2) GENERATED ALWAYS AS (card_total_profit + paypal_total_profit) STORED,
    
    -- Эффективность команды
    success_rate DECIMAL(5,2) DEFAULT 0, -- Процент успешных работ
    avg_profit_per_work DECIMAL(10,2) DEFAULT 0,
    avg_profit_per_junior DECIMAL(10,2) DEFAULT 0,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: одна запись на команду на день
    UNIQUE(date, team_lead_id)
);

-- Создание таблицы ежедневной статистики Junior'ов
CREATE TABLE junior_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    junior_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Работы с картами
    card_works_created INTEGER DEFAULT 0,
    card_works_completed INTEGER DEFAULT 0,
    card_total_deposits DECIMAL(10,2) DEFAULT 0,
    card_total_withdrawals DECIMAL(10,2) DEFAULT 0,
    card_total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Работы с PayPal
    paypal_works_created INTEGER DEFAULT 0,
    paypal_works_completed INTEGER DEFAULT 0,
    paypal_total_deposits DECIMAL(10,2) DEFAULT 0,
    paypal_total_withdrawals DECIMAL(10,2) DEFAULT 0,
    paypal_total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Общая статистика
    total_works_created INTEGER GENERATED ALWAYS AS (card_works_created + paypal_works_created) STORED,
    total_works_completed INTEGER GENERATED ALWAYS AS (card_works_completed + paypal_works_completed) STORED,
    total_deposits DECIMAL(10,2) GENERATED ALWAYS AS (card_total_deposits + paypal_total_deposits) STORED,
    total_withdrawals DECIMAL(10,2) GENERATED ALWAYS AS (card_total_withdrawals + paypal_total_withdrawals) STORED,
    total_profit DECIMAL(10,2) GENERATED ALWAYS AS (card_total_profit + paypal_total_profit) STORED,
    
    -- Индивидуальная эффективность
    success_rate DECIMAL(5,2) DEFAULT 0,
    avg_profit_per_work DECIMAL(10,2) DEFAULT 0,
    best_single_profit DECIMAL(10,2) DEFAULT 0, -- Лучший результат за день
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: одна запись на Junior'а на день
    UNIQUE(date, junior_id)
);

-- Создание таблицы ежемесячной статистики (агрегация)
CREATE TABLE monthly_team_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- YYYY-MM
    team_lead_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Агрегированная статистика за месяц
    avg_juniors_count DECIMAL(5,2) DEFAULT 0,
    total_works_created INTEGER DEFAULT 0,
    total_works_completed INTEGER DEFAULT 0,
    total_deposits DECIMAL(10,2) DEFAULT 0,
    total_withdrawals DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Эффективность команды за месяц
    month_success_rate DECIMAL(5,2) DEFAULT 0,
    best_day_profit DECIMAL(10,2) DEFAULT 0,
    worst_day_profit DECIMAL(10,2) DEFAULT 0,
    avg_daily_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Рейтинги
    profit_rank INTEGER, -- Место по прибыли среди всех команд
    efficiency_rank INTEGER, -- Место по эффективности
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(month, team_lead_id)
);

-- Создание индексов
CREATE INDEX idx_team_daily_stats_date ON team_daily_stats(date);
CREATE INDEX idx_team_daily_stats_team_lead_id ON team_daily_stats(team_lead_id);
CREATE INDEX idx_team_daily_stats_date_team_lead ON team_daily_stats(date, team_lead_id);

CREATE INDEX idx_junior_daily_stats_date ON junior_daily_stats(date);
CREATE INDEX idx_junior_daily_stats_junior_id ON junior_daily_stats(junior_id);
CREATE INDEX idx_junior_daily_stats_team_lead_id ON junior_daily_stats(team_lead_id);
CREATE INDEX idx_junior_daily_stats_date_junior ON junior_daily_stats(date, junior_id);

CREATE INDEX idx_monthly_team_stats_month ON monthly_team_stats(month);
CREATE INDEX idx_monthly_team_stats_team_lead_id ON monthly_team_stats(team_lead_id);
CREATE INDEX idx_monthly_team_stats_profit_rank ON monthly_team_stats(profit_rank);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_team_daily_stats_updated_at 
    BEFORE UPDATE ON team_daily_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_junior_daily_stats_updated_at 
    BEFORE UPDATE ON junior_daily_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_team_stats_updated_at 
    BEFORE UPDATE ON monthly_team_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE team_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE junior_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_team_stats ENABLE ROW LEVEL SECURITY;

-- Team Lead может видеть статистику своей команды
CREATE POLICY "team_daily_stats_teamlead_own" ON team_daily_stats
    FOR SELECT USING (
        team_lead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        )
    );

CREATE POLICY "monthly_team_stats_teamlead_own" ON monthly_team_stats
    FOR SELECT USING (
        team_lead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        )
    );

-- Junior может видеть свою статистику
CREATE POLICY "junior_daily_stats_own" ON junior_daily_stats
    FOR SELECT USING (
        junior_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Team Lead может видеть статистику своих Junior'ов
CREATE POLICY "junior_daily_stats_teamlead" ON junior_daily_stats
    FOR SELECT USING (
        team_lead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        )
    );

-- Manager, CFO, HR, Tester, Admin могут видеть всю статистику
CREATE POLICY "team_stats_admin_access" ON team_daily_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'hr', 'tester', 'admin') 
            AND status = 'active'
        )
    );

CREATE POLICY "junior_stats_admin_access" ON junior_daily_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'hr', 'tester', 'admin') 
            AND status = 'active'
        )
    );

CREATE POLICY "monthly_stats_admin_access" ON monthly_team_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'hr', 'tester', 'admin') 
            AND status = 'active'
        )
    );

-- Функция для расчета ежедневной статистики команд
CREATE OR REPLACE FUNCTION calculate_daily_team_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    team_record RECORD;
    junior_record RECORD;
    calculated_count INTEGER := 0;
BEGIN
    -- Рассчитываем статистику для каждой команды Team Lead'а
    FOR team_record IN 
        SELECT id as team_lead_id
        FROM users 
        WHERE role = 'teamlead' AND status = 'active'
    LOOP
        -- Удаляем старую запись за этот день
        DELETE FROM team_daily_stats 
        WHERE date = target_date AND team_lead_id = team_record.team_lead_id;
        
        -- Вставляем новую статистику команды
        INSERT INTO team_daily_stats (
            date, team_lead_id, juniors_count, active_juniors_count,
            card_works_created, card_works_completed, card_total_deposits, card_total_withdrawals, card_total_profit,
            paypal_works_created, paypal_works_completed, paypal_total_deposits, paypal_total_withdrawals, paypal_total_profit,
            success_rate, avg_profit_per_work, avg_profit_per_junior
        )
        SELECT 
            target_date,
            team_record.team_lead_id,
            COUNT(DISTINCT j.id) as juniors_count,
            COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_juniors_count,
            
            -- Статистика по картам
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date THEN w.id END) as card_works_created,
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) as card_works_completed,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) as card_total_deposits,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount ELSE 0 END), 0) as card_total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) as card_total_profit,
            
            -- Статистика по PayPal
            COUNT(DISTINCT CASE WHEN DATE(pw.created_at) = target_date THEN pw.id END) as paypal_works_created,
            COUNT(DISTINCT CASE WHEN DATE(pw.created_at) = target_date AND pw.status = 'completed' THEN pw.id END) as paypal_works_completed,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date THEN pw.deposit_amount ELSE 0 END), 0) as paypal_total_deposits,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount ELSE 0 END), 0) as paypal_total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0) as paypal_total_profit,
            
            -- Эффективность
            CASE 
                WHEN COUNT(CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN 1 END) > 0 THEN
                    (COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END) * 100.0 / 
                     COUNT(CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN 1 END))
                ELSE 0
            END as success_rate,
            
            CASE 
                WHEN COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END) > 0 THEN
                    (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) +
                     COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0)) /
                    COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END)
                ELSE 0
            END as avg_profit_per_work,
            
            CASE 
                WHEN COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) > 0 THEN
                    (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) +
                     COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0)) /
                    COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END)
                ELSE 0
            END as avg_profit_per_junior
            
        FROM users j
        LEFT JOIN works w ON w.user_id = j.id
        LEFT JOIN work_withdrawals ww ON ww.work_id = w.id
        LEFT JOIN paypal_works pw ON pw.user_id = j.id
        LEFT JOIN paypal_withdrawals pw_wd ON pw_wd.paypal_work_id = pw.id
        WHERE j.team_lead_id = team_record.team_lead_id AND j.role = 'junior';
        
        calculated_count := calculated_count + 1;
    END LOOP;
    
    -- Рассчитываем статистику для каждого Junior'а
    FOR junior_record IN 
        SELECT id as junior_id, team_lead_id
        FROM users 
        WHERE role = 'junior' AND status = 'active'
    LOOP
        -- Удаляем старую запись за этот день
        DELETE FROM junior_daily_stats 
        WHERE date = target_date AND junior_id = junior_record.junior_id;
        
        -- Вставляем новую статистику Junior'а
        INSERT INTO junior_daily_stats (
            date, junior_id, team_lead_id,
            card_works_created, card_works_completed, card_total_deposits, card_total_withdrawals, card_total_profit,
            paypal_works_created, paypal_works_completed, paypal_total_deposits, paypal_total_withdrawals, paypal_total_profit,
            success_rate, avg_profit_per_work, best_single_profit
        )
        SELECT 
            target_date,
            junior_record.junior_id,
            junior_record.team_lead_id,
            
            -- Статистика по картам
            COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END) as card_works_created,
            COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) as card_works_completed,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) as card_total_deposits,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount ELSE 0 END), 0) as card_total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) as card_total_profit,
            
            -- Статистика по PayPal
            COUNT(CASE WHEN DATE(pw.created_at) = target_date THEN pw.id END) as paypal_works_created,
            COUNT(CASE WHEN DATE(pw.created_at) = target_date AND pw.status = 'completed' THEN pw.id END) as paypal_works_completed,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date THEN pw.deposit_amount ELSE 0 END), 0) as paypal_total_deposits,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount ELSE 0 END), 0) as paypal_total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0) as paypal_total_profit,
            
            -- Эффективность
            CASE 
                WHEN COUNT(CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN 1 END) > 0 THEN
                    (COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END) * 100.0 / 
                     COUNT(CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN 1 END))
                ELSE 0
            END as success_rate,
            
            CASE 
                WHEN COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END) > 0 THEN
                    (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) +
                     COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0)) /
                    COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END)
                ELSE 0
            END as avg_profit_per_work,
            
            GREATEST(
                COALESCE(MAX(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount END), 0),
                COALESCE(MAX(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount END), 0)
            ) as best_single_profit
            
        FROM works w
        FULL OUTER JOIN work_withdrawals ww ON ww.work_id = w.id
        FULL OUTER JOIN paypal_works pw ON pw.user_id = junior_record.junior_id
        FULL OUTER JOIN paypal_withdrawals pw_wd ON pw_wd.paypal_work_id = pw.id
        WHERE w.user_id = junior_record.junior_id OR pw.user_id = junior_record.junior_id;
        
        calculated_count := calculated_count + 1;
    END LOOP;
    
    RETURN calculated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Права доступа
GRANT EXECUTE ON FUNCTION calculate_daily_team_stats TO authenticated;
GRANT SELECT ON team_daily_stats TO authenticated;
GRANT SELECT ON junior_daily_stats TO authenticated;
GRANT SELECT ON monthly_team_stats TO authenticated;

-- Комментарии
COMMENT ON TABLE team_daily_stats IS 'Ежедневная статистика команд Team Lead-ов (карты + PayPal)';
COMMENT ON TABLE junior_daily_stats IS 'Ежедневная статистика Junior-ов (карты + PayPal)';
COMMENT ON TABLE monthly_team_stats IS 'Ежемесячная агрегированная статистика команд';
COMMENT ON FUNCTION calculate_daily_team_stats IS 'Расчет ежедневной статистики команд и Junior-ов';
