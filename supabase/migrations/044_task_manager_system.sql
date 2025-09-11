-- Система управления задачами (Таск-менеджер)
-- Миграция 044: Таблицы для таск-менеджера

-- Enum для статусов задач
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled');

-- Enum для приоритетов задач
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Enum для типов проектов
CREATE TYPE project_type AS ENUM ('development', 'marketing', 'operations', 'hr', 'finance', 'testing', 'other');

-- Таблица проектов
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type project_type DEFAULT 'other',
    
    -- Владелец и создатель
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Статус и приоритет
    status VARCHAR(50) DEFAULT 'active',
    priority task_priority DEFAULT 'medium',
    
    -- Даты
    start_date DATE,
    end_date DATE,
    deadline DATE,
    
    -- Прогресс
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Бюджет (если применимо)
    budget DECIMAL(10,2),
    spent_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT projects_budget_positive CHECK (budget IS NULL OR budget >= 0),
    CONSTRAINT projects_spent_valid CHECK (spent_amount >= 0)
);

-- Таблица задач
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Основная информация
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_status task_status DEFAULT 'backlog',
    priority task_priority DEFAULT 'medium',
    
    -- Назначение
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Даты и время
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Оценка времени (в часах)
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Зависимости
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    depends_on_task_ids UUID[], -- Массив ID задач, от которых зависит эта задача
    
    -- Чек-лист (JSON)
    checklist JSONB DEFAULT '[]'::jsonb,
    
    -- Теги
    tags TEXT[],
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT tasks_hours_positive CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT tasks_actual_hours_positive CHECK (actual_hours >= 0)
);

-- Таблица комментариев к задачам
CREATE TABLE task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Внутренний комментарий (только для команды)
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица вложений к задачам
CREATE TABLE task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Информация о файле
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT attachments_file_size_positive CHECK (file_size > 0)
);

-- Таблица шаблонов задач
CREATE TABLE task_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Шаблон задач (JSON массив)
    template_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Кто может использовать шаблон
    created_by UUID NOT NULL REFERENCES users(id),
    allowed_roles TEXT[] DEFAULT ARRAY['coordinator', 'hr', 'manager', 'admin']::TEXT[],
    
    -- Категория шаблона
    category VARCHAR(100) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица OKR/стратегических целей
CREATE TABLE strategic_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Тип цели
    goal_type VARCHAR(50) DEFAULT 'okr', -- okr, milestone, kpi
    
    -- Владелец и создатель
    owner_id UUID NOT NULL REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Период
    quarter VARCHAR(7), -- 2024-Q1, 2024-Q2, etc.
    year INTEGER,
    
    -- Прогресс
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50), -- USD, %, количество, etc.
    
    -- Статус
    status VARCHAR(50) DEFAULT 'active',
    
    -- Даты
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Связанные проекты
    linked_project_ids UUID[],
    
    -- Метки времени
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT goals_dates_valid CHECK (end_date > start_date),
    CONSTRAINT goals_progress_valid CHECK (target_value IS NULL OR target_value > 0)
);

-- Создание индексов
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deadline ON projects(deadline);
CREATE INDEX idx_projects_type ON projects(project_type);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_team_lead_id ON tasks(team_lead_id);
CREATE INDEX idx_tasks_status ON tasks(task_status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);

CREATE INDEX idx_task_templates_created_by ON task_templates(created_by);
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_active ON task_templates(is_active);

CREATE INDEX idx_strategic_goals_owner_id ON strategic_goals(owner_id);
CREATE INDEX idx_strategic_goals_quarter ON strategic_goals(quarter);
CREATE INDEX idx_strategic_goals_year ON strategic_goals(year);
CREATE INDEX idx_strategic_goals_status ON strategic_goals(status);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at 
    BEFORE UPDATE ON task_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at 
    BEFORE UPDATE ON task_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategic_goals_updated_at 
    BEFORE UPDATE ON strategic_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_goals ENABLE ROW LEVEL SECURITY;

-- C-Level (CEO, CFO) могут видеть все проекты и задачи
CREATE POLICY "projects_clevel_all" ON projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('ceo', 'cfo') 
            AND status = 'active'
        )
    );

CREATE POLICY "tasks_clevel_all" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('ceo', 'cfo') 
            AND status = 'active'
        )
    );

-- Manager, HR, Admin могут управлять проектами и задачами
CREATE POLICY "projects_management" ON projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'hr', 'admin') 
            AND status = 'active'
        )
    );

CREATE POLICY "tasks_management" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'hr', 'admin') 
            AND status = 'active'
        )
    );

-- Team Lead может видеть задачи своей команды и создавать свои
CREATE POLICY "tasks_teamlead" ON tasks
    FOR ALL USING (
        assignee_id IN (
            SELECT id FROM users 
            WHERE team_lead_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
            )
        ) OR 
        team_lead_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        ) OR
        created_by IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'teamlead'
        )
    );

-- Junior может видеть только свои задачи
CREATE POLICY "tasks_junior_own" ON tasks
    FOR SELECT USING (
        assignee_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Junior может обновлять статус своих задач и добавлять комментарии
CREATE POLICY "tasks_junior_update" ON tasks
    FOR UPDATE USING (
        assignee_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'junior'
        )
    );

-- Комментарии: пользователи могут видеть и создавать комментарии к доступным им задачам
CREATE POLICY "task_comments_access" ON task_comments
    FOR ALL USING (
        task_id IN (
            SELECT id FROM tasks WHERE 
            -- Применяем те же правила, что и для задач
            assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
            created_by IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
            team_lead_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ceo', 'cfo', 'manager', 'hr', 'admin'))
        )
    );

-- Вложения: аналогично комментариям
CREATE POLICY "task_attachments_access" ON task_attachments
    FOR ALL USING (
        task_id IN (
            SELECT id FROM tasks WHERE 
            assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
            created_by IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
            team_lead_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('ceo', 'cfo', 'manager', 'hr', 'admin'))
        )
    );

-- Шаблоны: видят все, создавать могут указанные роли
CREATE POLICY "task_templates_read" ON task_templates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND status = 'active')
    );

CREATE POLICY "task_templates_manage" ON task_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('manager', 'hr', 'admin', 'ceo', 'cfo') 
            AND status = 'active'
        )
    );

-- Стратегические цели: C-Level и управление
CREATE POLICY "strategic_goals_clevel" ON strategic_goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('ceo', 'cfo', 'manager', 'admin') 
            AND status = 'active'
        )
    );

-- Функция для автоматического обновления прогресса проекта
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    new_progress INTEGER;
BEGIN
    -- Считаем задачи проекта
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN task_status = 'done' THEN 1 END)
    INTO total_tasks, completed_tasks
    FROM tasks 
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Рассчитываем прогресс
    IF total_tasks > 0 THEN
        new_progress := ROUND((completed_tasks * 100.0) / total_tasks);
    ELSE
        new_progress := 0;
    END IF;
    
    -- Обновляем прогресс проекта
    UPDATE projects 
    SET 
        progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления прогресса
CREATE TRIGGER trigger_update_project_progress
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress();

-- Функция для получения иерархии задач
CREATE OR REPLACE FUNCTION get_task_hierarchy(task_id UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    level INTEGER,
    path TEXT
) AS $$
WITH RECURSIVE task_tree AS (
    -- Базовый случай: начальная задача
    SELECT 
        t.id,
        t.title,
        0 as level,
        t.title::TEXT as path
    FROM tasks t
    WHERE t.id = task_id
    
    UNION ALL
    
    -- Рекурсивный случай: дочерние задачи
    SELECT 
        t.id,
        t.title,
        tt.level + 1,
        (tt.path || ' -> ' || t.title)::TEXT
    FROM tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT * FROM task_tree;
$$ LANGUAGE SQL STABLE;

-- Права доступа
GRANT SELECT ON projects TO authenticated;
GRANT SELECT ON tasks TO authenticated;
GRANT SELECT ON task_comments TO authenticated;
GRANT SELECT ON task_attachments TO authenticated;
GRANT SELECT ON task_templates TO authenticated;
GRANT SELECT ON strategic_goals TO authenticated;

GRANT EXECUTE ON FUNCTION update_project_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_hierarchy TO authenticated;

-- Комментарии к таблицам
COMMENT ON TABLE projects IS 'Проекты в системе управления задачами';
COMMENT ON TABLE tasks IS 'Задачи, привязанные к проектам и пользователям';
COMMENT ON TABLE task_comments IS 'Комментарии к задачам';
COMMENT ON TABLE task_attachments IS 'Вложения к задачам';
COMMENT ON TABLE task_templates IS 'Шаблоны задач для быстрого создания';
COMMENT ON TABLE strategic_goals IS 'OKR и стратегические цели C-Level';

COMMENT ON COLUMN tasks.depends_on_task_ids IS 'Массив UUID задач, от которых зависит данная задача';
COMMENT ON COLUMN tasks.checklist IS 'JSON массив чек-листа: [{"item": "text", "completed": false}]';
COMMENT ON COLUMN task_templates.template_tasks IS 'JSON шаблон задач для автоматического создания';
COMMENT ON COLUMN strategic_goals.linked_project_ids IS 'Массив UUID проектов, связанных с целью';
