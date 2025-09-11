-- Система статистики казино
-- Миграция 043: Статистика успешности казино

-- Создание таблицы ежедневной статистики казино
CREATE TABLE casino_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    
    -- Работы с картами
    card_works_created INTEGER DEFAULT 0,
    card_works_completed INTEGER DEFAULT 0,
    card_works_failed INTEGER DEFAULT 0,
    card_total_deposits DECIMAL(10,2) DEFAULT 0,
    card_total_withdrawals DECIMAL(10,2) DEFAULT 0,
    card_total_profit DECIMAL(10,2) DEFAULT 0,
    card_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Работы с PayPal
    paypal_works_created INTEGER DEFAULT 0,
    paypal_works_completed INTEGER DEFAULT 0,
    paypal_works_failed INTEGER DEFAULT 0,
    paypal_total_deposits DECIMAL(10,2) DEFAULT 0,
    paypal_total_withdrawals DECIMAL(10,2) DEFAULT 0,
    paypal_total_profit DECIMAL(10,2) DEFAULT 0,
    paypal_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Общая статистика
    total_works_created INTEGER GENERATED ALWAYS AS (card_works_created + paypal_works_created) STORED,
    total_works_completed INTEGER GENERATED ALWAYS AS (card_works_completed + paypal_works_completed) STORED,
    total_works_failed INTEGER GENERATED ALWAYS AS (card_works_failed + paypal_works_failed) STORED,
    total_deposits DECIMAL(10,2) GENERATED ALWAYS AS (card_total_deposits + paypal_total_deposits) STORED,
    total_withdrawals DECIMAL(10,2) GENERATED ALWAYS AS (card_total_withdrawals + paypal_total_withdrawals) STORED,
    total_profit DECIMAL(10,2) GENERATED ALWAYS AS (card_total_profit + paypal_total_profit) STORED,
    
    -- Общая эффективность казино
    overall_success_rate DECIMAL(5,2) DEFAULT 0,
    avg_profit_per_work DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0, -- Процент прибыли от депозитов
    
    -- Уникальные пользователи
    unique_users_count INTEGER DEFAULT 0,
    unique_cards_count INTEGER DEFAULT 0,
    unique_paypal_accounts_count INTEGER DEFAULT 0,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: одна запись на казино на день
    UNIQUE(date, casino_id)
);

-- Создание таблицы ежемесячной статистики казино
CREATE TABLE casino_monthly_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- YYYY-MM
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    
    -- Агрегированная статистика за месяц
    total_works_created INTEGER DEFAULT 0,
    total_works_completed INTEGER DEFAULT 0,
    total_deposits DECIMAL(10,2) DEFAULT 0,
    total_withdrawals DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Эффективность за месяц
    month_success_rate DECIMAL(5,2) DEFAULT 0,
    avg_daily_profit DECIMAL(10,2) DEFAULT 0,
    best_day_profit DECIMAL(10,2) DEFAULT 0,
    worst_day_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Пользователи за месяц
    total_unique_users INTEGER DEFAULT 0,
    total_unique_cards INTEGER DEFAULT 0,
    total_unique_paypal_accounts INTEGER DEFAULT 0,
    
    -- Рейтинги среди казино
    profit_rank INTEGER,
    success_rate_rank INTEGER,
    volume_rank INTEGER, -- По объему работ
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(month, casino_id)
);

-- Создание таблицы статистики банков (для сравнения с PayPal)
CREATE TABLE bank_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Статистика работ с картами банка
    works_created INTEGER DEFAULT 0,
    works_completed INTEGER DEFAULT 0,
    works_failed INTEGER DEFAULT 0,
    total_deposits DECIMAL(10,2) DEFAULT 0,
    total_withdrawals DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0,
    
    -- Эффективность банка
    success_rate DECIMAL(5,2) DEFAULT 0,
    avg_profit_per_work DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    
    -- Использование карт
    unique_cards_used INTEGER DEFAULT 0,
    unique_users_count INTEGER DEFAULT 0,
    unique_casinos_count INTEGER DEFAULT 0,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, bank_id)
);

-- Создание индексов
CREATE INDEX idx_casino_daily_stats_date ON casino_daily_stats(date);
CREATE INDEX idx_casino_daily_stats_casino_id ON casino_daily_stats(casino_id);
CREATE INDEX idx_casino_daily_stats_date_casino ON casino_daily_stats(date, casino_id);
CREATE INDEX idx_casino_daily_stats_success_rate ON casino_daily_stats(overall_success_rate);
CREATE INDEX idx_casino_daily_stats_profit ON casino_daily_stats(total_profit);

CREATE INDEX idx_casino_monthly_stats_month ON casino_monthly_stats(month);
CREATE INDEX idx_casino_monthly_stats_casino_id ON casino_monthly_stats(casino_id);
CREATE INDEX idx_casino_monthly_stats_profit_rank ON casino_monthly_stats(profit_rank);

CREATE INDEX idx_bank_daily_stats_date ON bank_daily_stats(date);
CREATE INDEX idx_bank_daily_stats_bank_id ON bank_daily_stats(bank_id);
CREATE INDEX idx_bank_daily_stats_success_rate ON bank_daily_stats(success_rate);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_casino_daily_stats_updated_at 
    BEFORE UPDATE ON casino_daily_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casino_monthly_stats_updated_at 
    BEFORE UPDATE ON casino_monthly_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_daily_stats_updated_at 
    BEFORE UPDATE ON bank_daily_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE casino_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE casino_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_daily_stats ENABLE ROW LEVEL SECURITY;

-- Все авторизованные пользователи могут видеть статистику
CREATE POLICY "casino_daily_stats_read" ON casino_daily_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND status = 'active'
        )
    );

CREATE POLICY "casino_monthly_stats_read" ON casino_monthly_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND status = 'active'
        )
    );

CREATE POLICY "bank_daily_stats_read" ON bank_daily_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Функция для расчета ежедневной статистики казино
CREATE OR REPLACE FUNCTION calculate_daily_casino_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    casino_record RECORD;
    bank_record RECORD;
    calculated_count INTEGER := 0;
BEGIN
    -- Рассчитываем статистику для каждого казино
    FOR casino_record IN 
        SELECT id as casino_id, name
        FROM casinos 
        WHERE status = 'active'
    LOOP
        -- Удаляем старую запись за этот день
        DELETE FROM casino_daily_stats 
        WHERE date = target_date AND casino_id = casino_record.casino_id;
        
        -- Вставляем новую статистику казино
        INSERT INTO casino_daily_stats (
            date, casino_id,
            card_works_created, card_works_completed, card_works_failed,
            card_total_deposits, card_total_withdrawals, card_total_profit, card_success_rate,
            paypal_works_created, paypal_works_completed, paypal_works_failed,
            paypal_total_deposits, paypal_total_withdrawals, paypal_total_profit, paypal_success_rate,
            overall_success_rate, avg_profit_per_work, profit_margin,
            unique_users_count, unique_cards_count, unique_paypal_accounts_count
        )
        SELECT 
            target_date,
            casino_record.casino_id,
            
            -- Статистика по картам
            COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END) as card_works_created,
            COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) as card_works_completed,
            COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'failed' THEN w.id END) as card_works_failed,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) as card_total_deposits,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount ELSE 0 END), 0) as card_total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) as card_total_profit,
            CASE 
                WHEN COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END) > 0 THEN
                    (COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) * 100.0 / 
                     COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END))
                ELSE 0
            END as card_success_rate,
            
            -- Статистика по PayPal
            COUNT(CASE WHEN DATE(pw.created_at) = target_date THEN pw.id END) as paypal_works_created,
            COUNT(CASE WHEN DATE(pw.created_at) = target_date AND pw.status = 'completed' THEN pw.id END) as paypal_works_completed,
            COUNT(CASE WHEN DATE(pw.created_at) = target_date AND pw.status = 'failed' THEN pw.id END) as paypal_works_failed,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date THEN pw.deposit_amount ELSE 0 END), 0) as paypal_total_deposits,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount ELSE 0 END), 0) as paypal_total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0) as paypal_total_profit,
            CASE 
                WHEN COUNT(CASE WHEN DATE(pw.created_at) = target_date THEN pw.id END) > 0 THEN
                    (COUNT(CASE WHEN DATE(pw.created_at) = target_date AND pw.status = 'completed' THEN pw.id END) * 100.0 / 
                     COUNT(CASE WHEN DATE(pw.created_at) = target_date THEN pw.id END))
                ELSE 0
            END as paypal_success_rate,
            
            -- Общая эффективность
            CASE 
                WHEN COUNT(CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN 1 END) > 0 THEN
                    (COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END) * 100.0 / 
                     COUNT(CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN 1 END))
                ELSE 0
            END as overall_success_rate,
            
            CASE 
                WHEN COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END) > 0 THEN
                    (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) +
                     COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0)) /
                    COUNT(CASE WHEN (DATE(w.created_at) = target_date AND w.status = 'completed') OR (DATE(pw.created_at) = target_date AND pw.status = 'completed') THEN 1 END)
                ELSE 0
            END as avg_profit_per_work,
            
            CASE 
                WHEN (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) +
                      COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date THEN pw.deposit_amount ELSE 0 END), 0)) > 0 THEN
                    ((COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) +
                      COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date AND pw_wd.status = 'completed' THEN pw_wd.withdrawal_amount - pw.deposit_amount ELSE 0 END), 0)) * 100.0 /
                     (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) +
                      COALESCE(SUM(CASE WHEN DATE(pw.created_at) = target_date THEN pw.deposit_amount ELSE 0 END), 0)))
                ELSE 0
            END as profit_margin,
            
            -- Уникальные пользователи и аккаунты
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date OR DATE(pw.created_at) = target_date THEN COALESCE(w.user_id, pw.user_id) END) as unique_users_count,
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date THEN w.card_id END) as unique_cards_count,
            COUNT(DISTINCT CASE WHEN DATE(pw.created_at) = target_date THEN pw.paypal_account_id END) as unique_paypal_accounts_count
            
        FROM works w
        FULL OUTER JOIN work_withdrawals ww ON ww.work_id = w.id
        FULL OUTER JOIN paypal_works pw ON pw.casino_id = casino_record.casino_id
        FULL OUTER JOIN paypal_withdrawals pw_wd ON pw_wd.paypal_work_id = pw.id
        WHERE w.casino_id = casino_record.casino_id OR pw.casino_id = casino_record.casino_id;
        
        calculated_count := calculated_count + 1;
    END LOOP;
    
    -- Рассчитываем статистику для каждого банка
    FOR bank_record IN 
        SELECT id as bank_id, name
        FROM banks 
        WHERE is_active = TRUE
    LOOP
        -- Удаляем старую запись за этот день
        DELETE FROM bank_daily_stats 
        WHERE date = target_date AND bank_id = bank_record.bank_id;
        
        -- Вставляем новую статистику банка
        INSERT INTO bank_daily_stats (
            date, bank_id,
            works_created, works_completed, works_failed,
            total_deposits, total_withdrawals, total_profit,
            success_rate, avg_profit_per_work, profit_margin,
            unique_cards_used, unique_users_count, unique_casinos_count
        )
        SELECT 
            target_date,
            bank_record.bank_id,
            
            COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END) as works_created,
            COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) as works_completed,
            COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'failed' THEN w.id END) as works_failed,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) as total_deposits,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount ELSE 0 END), 0) as total_withdrawals,
            COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) as total_profit,
            
            CASE 
                WHEN COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END) > 0 THEN
                    (COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) * 100.0 / 
                     COUNT(CASE WHEN DATE(w.created_at) = target_date THEN w.id END))
                ELSE 0
            END as success_rate,
            
            CASE 
                WHEN COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END) > 0 THEN
                    COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) /
                    COUNT(CASE WHEN DATE(w.created_at) = target_date AND w.status = 'completed' THEN w.id END)
                ELSE 0
            END as avg_profit_per_work,
            
            CASE 
                WHEN COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0) > 0 THEN
                    (COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date AND ww.status = 'received' THEN ww.withdrawal_amount - w.deposit_amount ELSE 0 END), 0) * 100.0 /
                     COALESCE(SUM(CASE WHEN DATE(w.created_at) = target_date THEN w.deposit_amount ELSE 0 END), 0))
                ELSE 0
            END as profit_margin,
            
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date THEN w.card_id END) as unique_cards_used,
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date THEN w.user_id END) as unique_users_count,
            COUNT(DISTINCT CASE WHEN DATE(w.created_at) = target_date THEN w.casino_id END) as unique_casinos_count
            
        FROM cards c
        LEFT JOIN works w ON w.card_id = c.id
        LEFT JOIN work_withdrawals ww ON ww.work_id = w.id
        WHERE c.bank_id = bank_record.bank_id;
        
        calculated_count := calculated_count + 1;
    END LOOP;
    
    RETURN calculated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Права доступа
GRANT EXECUTE ON FUNCTION calculate_daily_casino_stats TO authenticated;
GRANT SELECT ON casino_daily_stats TO authenticated;
GRANT SELECT ON casino_monthly_stats TO authenticated;
GRANT SELECT ON bank_daily_stats TO authenticated;

-- Комментарии
COMMENT ON TABLE casino_daily_stats IS 'Ежедневная статистика казино (карты + PayPal работы)';
COMMENT ON TABLE casino_monthly_stats IS 'Ежемесячная статистика казино с рейтингами';
COMMENT ON TABLE bank_daily_stats IS 'Ежедневная статистика банков (для сравнения с PayPal)';
COMMENT ON FUNCTION calculate_daily_casino_stats IS 'Расчет ежедневной статистики казино и банков';
