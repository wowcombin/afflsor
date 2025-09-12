-- Миграция 051: Назначения банков TeamLead'ам
-- Создание системы назначения банков TeamLead'ам для выпуска розовых карт

-- Таблица назначений банков TeamLead'ам
CREATE TABLE IF NOT EXISTS bank_teamlead_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    teamlead_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id), -- Manager который назначил
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности (с проверкой существования)
CREATE INDEX IF NOT EXISTS idx_bank_teamlead_assignments_bank_id ON bank_teamlead_assignments(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_teamlead_assignments_teamlead_id ON bank_teamlead_assignments(teamlead_id);
CREATE INDEX IF NOT EXISTS idx_bank_teamlead_assignments_assigned_by ON bank_teamlead_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_bank_teamlead_assignments_active ON bank_teamlead_assignments(is_active);

-- Уникальный индекс для предотвращения дублирования активных назначений
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_bank_teamlead_assignments_unique_active'
    ) THEN
        CREATE UNIQUE INDEX idx_bank_teamlead_assignments_unique_active 
        ON bank_teamlead_assignments(bank_id, teamlead_id) 
        WHERE is_active = TRUE;
    END IF;
END $$;

-- Триггер для обновления updated_at (с проверкой существования)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_bank_teamlead_assignments_updated_at'
    ) THEN
        CREATE TRIGGER update_bank_teamlead_assignments_updated_at 
            BEFORE UPDATE ON bank_teamlead_assignments 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS политики
ALTER TABLE bank_teamlead_assignments ENABLE ROW LEVEL SECURITY;

-- Manager и Admin могут управлять назначениями
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'bank_teamlead_assignments_manager_access' 
        AND tablename = 'bank_teamlead_assignments'
    ) THEN
        CREATE POLICY "bank_teamlead_assignments_manager_access" ON bank_teamlead_assignments
            FOR ALL USING (
                auth.uid() IN (
                    SELECT auth_id FROM users 
                    WHERE role IN ('manager', 'admin') 
                    AND status = 'active'
                )
            );
    END IF;
END $$;

-- TeamLead может видеть свои назначения
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'bank_teamlead_assignments_teamlead_view' 
        AND tablename = 'bank_teamlead_assignments'
    ) THEN
        CREATE POLICY "bank_teamlead_assignments_teamlead_view" ON bank_teamlead_assignments
            FOR SELECT USING (
                teamlead_id IN (
                    SELECT id FROM users 
                    WHERE auth_id = auth.uid() 
                    AND role = 'teamlead' 
                    AND status = 'active'
                )
            );
    END IF;
END $$;

-- HR и CFO могут просматривать назначения
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'bank_teamlead_assignments_hr_cfo_view' 
        AND tablename = 'bank_teamlead_assignments'
    ) THEN
        CREATE POLICY "bank_teamlead_assignments_hr_cfo_view" ON bank_teamlead_assignments
            FOR SELECT USING (
                auth.uid() IN (
                    SELECT auth_id FROM users 
                    WHERE role IN ('hr', 'cfo') 
                    AND status = 'active'
                )
            );
    END IF;
END $$;

-- Комментарии к таблице и полям
COMMENT ON TABLE bank_teamlead_assignments IS 'Назначения банков TeamLead''ам для выпуска розовых карт';
COMMENT ON COLUMN bank_teamlead_assignments.bank_id IS 'ID банка';
COMMENT ON COLUMN bank_teamlead_assignments.teamlead_id IS 'ID TeamLead''а';
COMMENT ON COLUMN bank_teamlead_assignments.assigned_by IS 'ID Manager''а который назначил';
COMMENT ON COLUMN bank_teamlead_assignments.is_active IS 'Активно ли назначение';
COMMENT ON COLUMN bank_teamlead_assignments.notes IS 'Заметки о назначении';

-- Функция для назначения банка TeamLead'у
CREATE OR REPLACE FUNCTION assign_bank_to_teamlead(
    p_bank_id UUID,
    p_teamlead_id UUID,
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_bank_name TEXT;
    v_teamlead_name TEXT;
    v_manager_name TEXT;
BEGIN
    -- Проверяем существование банка
    SELECT name INTO v_bank_name FROM banks WHERE id = p_bank_id AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Банк не найден или неактивен';
    END IF;

    -- Проверяем существование TeamLead'а
    SELECT CONCAT(first_name, ' ', last_name) INTO v_teamlead_name 
    FROM users WHERE id = p_teamlead_id AND role = 'teamlead' AND status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'TeamLead не найден или неактивен';
    END IF;

    -- Проверяем права назначающего
    SELECT CONCAT(first_name, ' ', last_name) INTO v_manager_name 
    FROM users WHERE id = p_assigned_by AND role IN ('manager', 'admin') AND status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Недостаточно прав для назначения';
    END IF;

    -- Деактивируем существующие назначения этого банка этому TeamLead'у
    UPDATE bank_teamlead_assignments 
    SET is_active = FALSE, updated_at = NOW()
    WHERE bank_id = p_bank_id AND teamlead_id = p_teamlead_id AND is_active = TRUE;

    -- Создаем новое назначение
    INSERT INTO bank_teamlead_assignments (
        bank_id, 
        teamlead_id, 
        assigned_by, 
        notes,
        is_active
    ) VALUES (
        p_bank_id, 
        p_teamlead_id, 
        p_assigned_by, 
        COALESCE(p_notes, 'Назначен банк ' || v_bank_name || ' для TeamLead ' || v_teamlead_name),
        TRUE
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Ошибка назначения банка: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для отзыва назначения банка у TeamLead'а
CREATE OR REPLACE FUNCTION revoke_bank_from_teamlead(
    p_bank_id UUID,
    p_teamlead_id UUID,
    p_revoked_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_assignment_count INTEGER;
BEGIN
    -- Проверяем права отзывающего
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_revoked_by 
        AND role IN ('manager', 'admin') 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Недостаточно прав для отзыва назначения';
    END IF;

    -- Деактивируем назначения
    UPDATE bank_teamlead_assignments 
    SET is_active = FALSE, updated_at = NOW()
    WHERE bank_id = p_bank_id 
    AND teamlead_id = p_teamlead_id 
    AND is_active = TRUE;

    GET DIAGNOSTICS v_assignment_count = ROW_COUNT;

    IF v_assignment_count = 0 THEN
        RAISE EXCEPTION 'Активное назначение не найдено';
    END IF;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Ошибка отзыва назначения: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Представление для удобного просмотра назначений
CREATE OR REPLACE VIEW teamlead_bank_assignments_view AS
SELECT 
    bta.id,
    bta.bank_id,
    bta.teamlead_id,
    bta.assigned_by,
    bta.assigned_at,
    bta.is_active,
    bta.notes,
    b.name as bank_name,
    b.country as bank_country,
    b.currency as bank_currency,
    CONCAT(tl.first_name, ' ', tl.last_name) as teamlead_name,
    tl.email as teamlead_email,
    CONCAT(mgr.first_name, ' ', mgr.last_name) as assigned_by_name,
    mgr.email as assigned_by_email,
    COUNT(ba.id) as total_accounts,
    COUNT(CASE WHEN ba.is_active THEN 1 END) as active_accounts,
    COALESCE(SUM(CASE WHEN ba.is_active THEN ba.balance ELSE 0 END), 0) as total_balance
FROM bank_teamlead_assignments bta
JOIN banks b ON bta.bank_id = b.id
JOIN users tl ON bta.teamlead_id = tl.id
JOIN users mgr ON bta.assigned_by = mgr.id
LEFT JOIN bank_accounts ba ON ba.bank_id = b.id
GROUP BY 
    bta.id, bta.bank_id, bta.teamlead_id, bta.assigned_by, 
    bta.assigned_at, bta.is_active, bta.notes,
    b.name, b.country, b.currency,
    tl.first_name, tl.last_name, tl.email,
    mgr.first_name, mgr.last_name, mgr.email;

-- Комментарий к представлению
COMMENT ON VIEW teamlead_bank_assignments_view IS 'Представление назначений банков TeamLead''ам с детальной информацией';
