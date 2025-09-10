-- Система назначения банков Team Lead'ам
-- Миграция 036: Назначение банков Team Lead'ам

-- Создание таблицы назначений банков Team Lead'ам
CREATE TABLE bank_teamlead_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    teamlead_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: один банк может быть назначен только одному активному Team Lead
    UNIQUE(bank_id, is_active) WHERE is_active = TRUE
);

-- Создание таблицы назначений казино Team Lead'ам
CREATE TABLE casino_teamlead_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    teamlead_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: одно казино может быть назначено нескольким Team Lead'ам
    UNIQUE(casino_id, teamlead_id, is_active) WHERE is_active = TRUE
);

-- Создание индексов
CREATE INDEX idx_bank_teamlead_assignments_bank_id ON bank_teamlead_assignments(bank_id);
CREATE INDEX idx_bank_teamlead_assignments_teamlead_id ON bank_teamlead_assignments(teamlead_id);
CREATE INDEX idx_bank_teamlead_assignments_active ON bank_teamlead_assignments(is_active);

CREATE INDEX idx_casino_teamlead_assignments_casino_id ON casino_teamlead_assignments(casino_id);
CREATE INDEX idx_casino_teamlead_assignments_teamlead_id ON casino_teamlead_assignments(teamlead_id);
CREATE INDEX idx_casino_teamlead_assignments_active ON casino_teamlead_assignments(is_active);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_bank_teamlead_assignments_updated_at 
    BEFORE UPDATE ON bank_teamlead_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casino_teamlead_assignments_updated_at 
    BEFORE UPDATE ON casino_teamlead_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE bank_teamlead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE casino_teamlead_assignments ENABLE ROW LEVEL SECURITY;

-- Team Lead может видеть свои назначения
CREATE POLICY "bank_assignments_teamlead_own" ON bank_teamlead_assignments
    FOR SELECT USING (
        teamlead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        )
    );

CREATE POLICY "casino_assignments_teamlead_own" ON casino_teamlead_assignments
    FOR SELECT USING (
        teamlead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        )
    );

-- Manager, CFO, Tester, HR, Admin могут управлять назначениями
CREATE POLICY "bank_assignments_admin_access" ON bank_teamlead_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'tester', 'hr', 'admin') 
            AND status = 'active'
        )
    );

CREATE POLICY "casino_assignments_admin_access" ON casino_teamlead_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'tester', 'hr', 'admin') 
            AND status = 'active'
        )
    );

-- Комментарии к таблицам
COMMENT ON TABLE bank_teamlead_assignments IS 'Назначения банков Team Lead-ам для управления командами';
COMMENT ON TABLE casino_teamlead_assignments IS 'Назначения казино Team Lead-ам для работы команд';

COMMENT ON COLUMN bank_teamlead_assignments.assigned_by IS 'Кто назначил (Manager, CFO, Tester, Admin)';
COMMENT ON COLUMN casino_teamlead_assignments.assigned_by IS 'Кто назначил (Manager, CFO, Tester, Admin)';
COMMENT ON COLUMN bank_teamlead_assignments.is_active IS 'Активно ли назначение (FALSE = отозвано)';
COMMENT ON COLUMN casino_teamlead_assignments.is_active IS 'Активно ли назначение (FALSE = отозвано)';
