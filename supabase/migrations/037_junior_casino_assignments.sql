-- Система назначения Junior'ов к казино через Team Lead
-- Миграция 037: Назначение Junior'ов к казино

-- Создание таблицы назначений Junior'ов к казино
CREATE TABLE junior_casino_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
    junior_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teamlead_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Уникальность будет создана индексом
);

-- Создание индексов
CREATE INDEX idx_junior_casino_assignments_casino_id ON junior_casino_assignments(casino_id);
CREATE INDEX idx_junior_casino_assignments_junior_id ON junior_casino_assignments(junior_id);
CREATE INDEX idx_junior_casino_assignments_teamlead_id ON junior_casino_assignments(teamlead_id);
CREATE INDEX idx_junior_casino_assignments_active ON junior_casino_assignments(is_active);

-- Создание уникального индекса с условием для активных назначений
-- Junior может быть назначен на одно казино только один раз активно
CREATE UNIQUE INDEX unique_junior_casino_active 
    ON junior_casino_assignments(casino_id, junior_id) 
    WHERE is_active = TRUE;

-- Триггер для обновления updated_at
CREATE TRIGGER update_junior_casino_assignments_updated_at 
    BEFORE UPDATE ON junior_casino_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE junior_casino_assignments ENABLE ROW LEVEL SECURITY;

-- Junior может видеть свои назначения
CREATE POLICY "junior_casino_assignments_own" ON junior_casino_assignments
    FOR SELECT USING (
        junior_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Team Lead может видеть и управлять назначениями своих Junior'ов
CREATE POLICY "junior_casino_assignments_teamlead" ON junior_casino_assignments
    FOR ALL USING (
        teamlead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead' AND status = 'active'
        )
    );

-- Manager, CFO, Tester, HR, Admin могут видеть и управлять всеми назначениями
CREATE POLICY "junior_casino_assignments_admin" ON junior_casino_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'cfo', 'tester', 'hr', 'admin') 
            AND status = 'active'
        )
    );

-- Комментарии к таблице
COMMENT ON TABLE junior_casino_assignments IS 'Назначения Junior-ов к казино через Team Lead. Junior может быть назначен на казино только один раз активно';

COMMENT ON COLUMN junior_casino_assignments.casino_id IS 'Казино, к которому назначен Junior';
COMMENT ON COLUMN junior_casino_assignments.junior_id IS 'Junior, который назначен к казино';
COMMENT ON COLUMN junior_casino_assignments.teamlead_id IS 'Team Lead, который управляет этим назначением';
COMMENT ON COLUMN junior_casino_assignments.assigned_by IS 'Кто создал назначение (Team Lead или вышестоящий)';
COMMENT ON COLUMN junior_casino_assignments.is_active IS 'Активно ли назначение (FALSE = отозвано)';
