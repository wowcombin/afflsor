-- Автоматическое управление участниками команд по ролям и структуре

-- Добавляем поле для типа команды
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_type VARCHAR(50);

-- Обновляем существующие команды с типами
UPDATE teams SET team_type = 'all' WHERE name = 'Xbsidian All Team';
UPDATE teams SET team_type = 'manager' WHERE name = 'Xbsidian Manager Team';
UPDATE teams SET team_type = 'manual_qa' WHERE name = 'Xbsidian Manual QA Team';
UPDATE teams SET team_type = 'interview' WHERE name = 'Xbsidian Interview Team';

-- Добавляем новую команду для Team Lead
INSERT INTO teams (name, description, team_type, is_active, created_at, updated_at)
VALUES (
  'Xbsidian Lead Team',
  'Команда всех Team Lead для координации',
  'lead',
  true,
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  team_type = 'lead',
  description = 'Команда всех Team Lead для координации';

-- Функция для автоматического добавления участников в команды по ролям
CREATE OR REPLACE FUNCTION sync_team_members()
RETURNS void AS $$
DECLARE
    team_record RECORD;
    user_record RECORD;
    current_user_id UUID;
BEGIN
    -- Получаем ID системного пользователя (admin) для added_by
    SELECT id INTO current_user_id 
    FROM users 
    WHERE role = 'admin' 
    LIMIT 1;
    
    IF current_user_id IS NULL THEN
        -- Если нет админа, используем первого пользователя
        SELECT id INTO current_user_id 
        FROM users 
        LIMIT 1;
    END IF;

    -- Очищаем все активные участники команд (деактивируем)
    UPDATE team_members 
    SET is_active = false, 
        left_at = NOW(),
        removed_by = current_user_id
    WHERE is_active = true;

    -- Синхронизируем команды по типам
    FOR team_record IN SELECT * FROM teams WHERE is_active = true LOOP
        
        -- Xbsidian All Team - все роли
        IF team_record.team_type = 'all' THEN
            FOR user_record IN 
                SELECT * FROM users 
                WHERE status = 'active' 
                AND role IN ('ceo', 'teamlead', 'qa_assistant', 'cfo', 'hr', 'manager', 'tester', 'junior')
            LOOP
                INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
                VALUES (team_record.id, user_record.id, 'member', current_user_id, true, NOW())
                ON CONFLICT (team_id, user_id) DO UPDATE SET
                    is_active = true,
                    joined_at = NOW(),
                    left_at = NULL,
                    removed_by = NULL;
            END LOOP;
            
        -- Xbsidian Manager Team - управленческие роли
        ELSIF team_record.team_type = 'manager' THEN
            FOR user_record IN 
                SELECT * FROM users 
                WHERE status = 'active' 
                AND role IN ('ceo', 'cfo', 'hr', 'manager', 'tester')
            LOOP
                INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
                VALUES (team_record.id, user_record.id, 'member', current_user_id, true, NOW())
                ON CONFLICT (team_id, user_id) DO UPDATE SET
                    is_active = true,
                    joined_at = NOW(),
                    left_at = NULL,
                    removed_by = NULL;
            END LOOP;
            
        -- Xbsidian Lead Team - Team Lead + управленческие роли
        ELSIF team_record.team_type = 'lead' THEN
            FOR user_record IN 
                SELECT * FROM users 
                WHERE status = 'active' 
                AND role IN ('ceo', 'cfo', 'hr', 'manager', 'tester', 'teamlead')
            LOOP
                INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
                VALUES (team_record.id, user_record.id, 'member', current_user_id, true, NOW())
                ON CONFLICT (team_id, user_id) DO UPDATE SET
                    is_active = true,
                    joined_at = NOW(),
                    left_at = NULL,
                    removed_by = NULL;
            END LOOP;
            
        -- Xbsidian Manual QA Team - QA роли + управленческие
        ELSIF team_record.team_type = 'manual_qa' THEN
            FOR user_record IN 
                SELECT * FROM users 
                WHERE status = 'active' 
                AND role IN ('ceo', 'manager', 'tester', 'cfo', 'qa_assistant')
            LOOP
                INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
                VALUES (team_record.id, user_record.id, 'member', current_user_id, true, NOW())
                ON CONFLICT (team_id, user_id) DO UPDATE SET
                    is_active = true,
                    joined_at = NOW(),
                    left_at = NULL,
                    removed_by = NULL;
            END LOOP;
            
        -- Xbsidian Interview Team - HR + Team Lead + неназначенные Junior
        ELSIF team_record.team_type = 'interview' THEN
            -- Добавляем управленческие роли
            FOR user_record IN 
                SELECT * FROM users 
                WHERE status = 'active' 
                AND role IN ('ceo', 'manager', 'hr', 'teamlead')
            LOOP
                INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
                VALUES (team_record.id, user_record.id, 'member', current_user_id, true, NOW())
                ON CONFLICT (team_id, user_id) DO UPDATE SET
                    is_active = true,
                    joined_at = NOW(),
                    left_at = NULL,
                    removed_by = NULL;
            END LOOP;
            
            -- Добавляем неназначенных Junior (без team_lead_id)
            FOR user_record IN 
                SELECT * FROM users 
                WHERE status = 'active' 
                AND role = 'junior'
                AND team_lead_id IS NULL
            LOOP
                INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
                VALUES (team_record.id, user_record.id, 'member', current_user_id, true, NOW())
                ON CONFLICT (team_id, user_id) DO UPDATE SET
                    is_active = true,
                    joined_at = NOW(),
                    left_at = NULL,
                    removed_by = NULL;
            END LOOP;
        END IF;
    END LOOP;

    -- Создаем индивидуальные команды для каждого Team Lead
    FOR user_record IN 
        SELECT * FROM users 
        WHERE status = 'active' 
        AND role = 'teamlead'
    LOOP
        -- Создаем или обновляем команду для Team Lead
        INSERT INTO teams (name, description, team_type, is_active, created_at, updated_at)
        VALUES (
            'Xbsidian Lead ' || user_record.id || ' Team',
            'Команда Team Lead: ' || user_record.first_name || ' ' || user_record.last_name,
            'individual_lead',
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (name) DO UPDATE SET
            description = 'Команда Team Lead: ' || user_record.first_name || ' ' || user_record.last_name,
            is_active = true,
            updated_at = NOW();
            
        -- Получаем ID созданной команды
        DECLARE
            team_lead_team_id UUID;
        BEGIN
            SELECT id INTO team_lead_team_id 
            FROM teams 
            WHERE name = 'Xbsidian Lead ' || user_record.id || ' Team';
            
            -- Добавляем управленческие роли в команду Team Lead
            INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
            SELECT team_lead_team_id, u.id, 'member', current_user_id, true, NOW()
            FROM users u
            WHERE u.status = 'active' 
            AND u.role IN ('ceo', 'manager', 'hr')
            ON CONFLICT (team_id, user_id) DO UPDATE SET
                is_active = true,
                joined_at = NOW(),
                left_at = NULL,
                removed_by = NULL;
                
            -- Добавляем самого Team Lead
            INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
            VALUES (team_lead_team_id, user_record.id, 'admin', current_user_id, true, NOW())
            ON CONFLICT (team_id, user_id) DO UPDATE SET
                is_active = true,
                role = 'admin',
                joined_at = NOW(),
                left_at = NULL,
                removed_by = NULL;
                
            -- Добавляем всех Junior, назначенных этому Team Lead
            INSERT INTO team_members (team_id, user_id, role, added_by, is_active, joined_at)
            SELECT team_lead_team_id, j.id, 'member', current_user_id, true, NOW()
            FROM users j
            WHERE j.status = 'active' 
            AND j.role = 'junior'
            AND j.team_lead_id = user_record.id
            ON CONFLICT (team_id, user_id) DO UPDATE SET
                is_active = true,
                joined_at = NOW(),
                left_at = NULL,
                removed_by = NULL;
        END;
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической синхронизации при изменении пользователей
CREATE OR REPLACE FUNCTION trigger_sync_team_members()
RETURNS TRIGGER AS $$
BEGIN
    -- Запускаем синхронизацию после изменения пользователя
    PERFORM sync_team_members();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры на изменения пользователей
DROP TRIGGER IF EXISTS sync_teams_on_user_change ON users;
CREATE TRIGGER sync_teams_on_user_change
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_team_members();

-- Запускаем первичную синхронизацию
SELECT sync_team_members();

-- API функция для ручной синхронизации
CREATE OR REPLACE FUNCTION manual_sync_teams()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    PERFORM sync_team_members();
    
    SELECT json_build_object(
        'success', true,
        'message', 'Teams synchronized successfully',
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
