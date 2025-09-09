-- Расширяем систему команд: созвоны, история участников, детальное управление

-- Добавляем поля в таблицу team_members для истории
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Создаем таблицу созвонов
CREATE TABLE IF NOT EXISTS team_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 20,
  schedule_time TIME, -- время проведения (например, 09:00)
  schedule_days TEXT[], -- дни недели ['monday', 'tuesday', ...]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Создаем таблицу программы созвонов (agenda items)
CREATE TABLE IF NOT EXISTS call_agenda_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES team_calls(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  speaker_role VARCHAR(50), -- роль спикера (coordinator, teamlead, etc.)
  speaker_user_id UUID REFERENCES users(id), -- конкретный пользователь-спикер
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Создаем таблицу истории участия в командах
CREATE TABLE IF NOT EXISTS team_member_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'joined', 'left', 'role_changed', 'promoted', 'demoted'
  old_role VARCHAR(50),
  new_role VARCHAR(50),
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Добавляем индексы
CREATE INDEX IF NOT EXISTS idx_team_calls_team_id ON team_calls(team_id);
CREATE INDEX IF NOT EXISTS idx_team_calls_active ON team_calls(is_active);
CREATE INDEX IF NOT EXISTS idx_call_agenda_items_call_id ON call_agenda_items(call_id);
CREATE INDEX IF NOT EXISTS idx_call_agenda_items_order ON call_agenda_items(call_id, order_number);
CREATE INDEX IF NOT EXISTS idx_team_member_history_team_id ON team_member_history(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_history_user_id ON team_member_history(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);

-- Добавляем RLS политики для новых таблиц
ALTER TABLE team_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_history ENABLE ROW LEVEL SECURITY;

-- Политики для team_calls
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_calls' 
    AND policyname = 'HR and Admin can view team calls'
  ) THEN
    CREATE POLICY "HR and Admin can view team calls" ON team_calls
    FOR SELECT USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin', 'manager') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_calls' 
    AND policyname = 'HR and Admin can manage team calls'
  ) THEN
    CREATE POLICY "HR and Admin can manage team calls" ON team_calls
    FOR ALL USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

-- Политики для call_agenda_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_agenda_items' 
    AND policyname = 'HR and Admin can view agenda items'
  ) THEN
    CREATE POLICY "HR and Admin can view agenda items" ON call_agenda_items
    FOR SELECT USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin', 'manager') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_agenda_items' 
    AND policyname = 'HR and Admin can manage agenda items'
  ) THEN
    CREATE POLICY "HR and Admin can manage agenda items" ON call_agenda_items
    FOR ALL USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

-- Политики для team_member_history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_member_history' 
    AND policyname = 'HR and Admin can view member history'
  ) THEN
    CREATE POLICY "HR and Admin can view member history" ON team_member_history
    FOR SELECT USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin', 'manager') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_member_history' 
    AND policyname = 'HR and Admin can manage member history'
  ) THEN
    CREATE POLICY "HR and Admin can manage member history" ON team_member_history
    FOR ALL USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

-- Добавляем пример созвона для Manager Team
INSERT INTO team_calls (team_id, name, description, duration_minutes, schedule_time, schedule_days)
SELECT 
  t.id,
  'Утренний созвон с тим лидами',
  'Ежедневный созвон для координации работы команд',
  20,
  '09:00:00',
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
FROM teams t 
WHERE t.name = 'Xbsidian Manager Team'
ON CONFLICT DO NOTHING;

-- Добавляем программу созвона
DO $$
DECLARE
  call_id_var UUID;
BEGIN
  -- Получаем ID созвона
  SELECT tc.id INTO call_id_var
  FROM team_calls tc
  JOIN teams t ON tc.team_id = t.id
  WHERE t.name = 'Xbsidian Manager Team' 
  AND tc.name = 'Утренний созвон с тим лидами';

  -- Добавляем пункты программы, если созвон найден
  IF call_id_var IS NOT NULL THEN
    INSERT INTO call_agenda_items (call_id, order_number, title, description, duration_minutes, speaker_role) VALUES
    (call_id_var, 1, 'Ожидание опоздавших', 'Минута, что-бы дождаться всех опоздавших', 1, 'manager'),
    (call_id_var, 2, 'Приветствие и мотивация', 'Минута, поздороваться, дать мотивацию на день', 1, 'manager'),
    (call_id_var, 3, 'Знакомство с новичками', 'Минута, поздороваться и познакомится с новичками', 1, 'manager'),
    (call_id_var, 4, 'Распределение задач', 'Три минуты, распределить задачи', 3, 'manager'),
    (call_id_var, 5, 'Разбор деталей', 'Три минуты на разбор деталей по темам', 3, 'manager'),
    (call_id_var, 6, 'Замечания и комплименты', 'Три минуты на замечания и комплименты', 3, 'manager'),
    (call_id_var, 7, 'Дополнительные объявления', 'Две минуты, на дополнительные объявления', 2, 'manager'),
    (call_id_var, 8, 'Финальная мотивация', 'Одна минута на мотивацию на день', 1, 'manager'),
    (call_id_var, 9, 'Вопросы и ответы', 'Вопросы ответы, вся команда', 5, NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Создаем функцию для автоматического логирования изменений в team_members
CREATE OR REPLACE FUNCTION log_team_member_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- При добавлении нового участника
  IF TG_OP = 'INSERT' THEN
    INSERT INTO team_member_history (team_id, user_id, action, new_role, performed_by)
    VALUES (NEW.team_id, NEW.user_id, 'joined', NEW.role, NEW.added_by);
    RETURN NEW;
  END IF;

  -- При изменении роли
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      INSERT INTO team_member_history (team_id, user_id, action, old_role, new_role, performed_by)
      VALUES (NEW.team_id, NEW.user_id, 'role_changed', OLD.role, NEW.role, NEW.added_by);
    END IF;
    
    -- При деактивации участника
    IF OLD.is_active = true AND NEW.is_active = false THEN
      INSERT INTO team_member_history (team_id, user_id, action, old_role, performed_by)
      VALUES (NEW.team_id, NEW.user_id, 'left', OLD.role, NEW.removed_by);
    END IF;
    
    RETURN NEW;
  END IF;

  -- При удалении участника
  IF TG_OP = 'DELETE' THEN
    INSERT INTO team_member_history (team_id, user_id, action, old_role, performed_by)
    VALUES (OLD.team_id, OLD.user_id, 'removed', OLD.role, OLD.removed_by);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического логирования
DROP TRIGGER IF EXISTS team_member_changes_trigger ON team_members;
CREATE TRIGGER team_member_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW EXECUTE FUNCTION log_team_member_changes();

-- Комментарии
COMMENT ON TABLE team_calls IS 'Созвоны команд с расписанием';
COMMENT ON TABLE call_agenda_items IS 'Программа созвонов (agenda items)';
COMMENT ON TABLE team_member_history IS 'История изменений участников команд';
COMMENT ON COLUMN team_calls.schedule_time IS 'Время проведения созвона (HH:MM)';
COMMENT ON COLUMN team_calls.schedule_days IS 'Дни недели проведения созвона';
COMMENT ON COLUMN call_agenda_items.speaker_role IS 'Роль спикера (coordinator, teamlead, etc.)';
COMMENT ON COLUMN call_agenda_items.speaker_user_id IS 'Конкретный пользователь-спикер';
COMMENT ON COLUMN team_member_history.action IS 'Действие: joined, left, role_changed, promoted, demoted';
