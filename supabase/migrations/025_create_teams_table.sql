-- Создаем таблицу команд
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  chat_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Создаем таблицу участников команд
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member, leader, admin
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Добавляем индексы
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Добавляем RLS политики
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Политики для teams
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teams' 
    AND policyname = 'HR and Admin can view teams'
  ) THEN
    CREATE POLICY "HR and Admin can view teams" ON teams
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
    WHERE tablename = 'teams' 
    AND policyname = 'HR and Admin can manage teams'
  ) THEN
    CREATE POLICY "HR and Admin can manage teams" ON teams
    FOR ALL USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

-- Политики для team_members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_members' 
    AND policyname = 'HR and Admin can view team members'
  ) THEN
    CREATE POLICY "HR and Admin can view team members" ON team_members
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
    WHERE tablename = 'team_members' 
    AND policyname = 'HR and Admin can manage team members'
  ) THEN
    CREATE POLICY "HR and Admin can manage team members" ON team_members
    FOR ALL USING (
      auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('hr', 'admin') 
        AND status = 'active'
      )
    );
  END IF;
END $$;

-- Добавляем предопределенные команды
INSERT INTO teams (name, description, chat_link) VALUES
('Xbsidian All Team', 'Общая команда всех сотрудников', NULL),
('Xbsidian Manager Team', 'Команда менеджеров и координаторов', NULL),
('Xbsidian Manual QA Team', 'Команда тестировщиков казино', NULL),
('Xbsidian Interview Team', 'Команда для собеседований и HR процессов', NULL)
ON CONFLICT (name) DO NOTHING;

-- Комментарии
COMMENT ON TABLE teams IS 'Специальные команды в организации';
COMMENT ON TABLE team_members IS 'Участники команд';
COMMENT ON COLUMN teams.chat_link IS 'Ссылка на чат команды';
COMMENT ON COLUMN team_members.role IS 'Роль в команде: member, leader, admin';
