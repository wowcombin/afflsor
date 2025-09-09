-- Система красивых названий команд Team Lead на основе специй

-- Создаем таблицу специй для названий команд
CREATE TABLE IF NOT EXISTS team_spice_names (
    id SERIAL PRIMARY KEY,
    spice_name VARCHAR(50) NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Заполняем таблицу специями
INSERT INTO team_spice_names (spice_name) VALUES
('Mint'), ('Cardamom'), ('Canella'), ('Vanilla'), ('Cinnamon'),
('Ginger'), ('Nutmeg'), ('Clove'), ('Saffron'), ('Paprika'),
('Turmeric'), ('Cumin'), ('Coriander'), ('Fennel'), ('Anise'),
('Basil'), ('Oregano'), ('Thyme'), ('Rosemary'), ('Sage'),
('Lavender'), ('Pepper'), ('Chili'), ('Garlic'), ('Onion'),
('Mustard'), ('Sesame'), ('Poppy'), ('Caraway'), ('Dill'),
('Parsley'), ('Cilantro'), ('Tarragon'), ('Marjoram'), ('Bay'),
('Juniper'), ('Allspice'), ('Mace'), ('Star Anise'), ('Fenugreek'),
('Sumac'), ('Nigella'), ('Asafoetida'), ('Galangal'), ('Lemongrass'),
('Kaffir Lime'), ('Curry Leaf'), ('Pandan'), ('Wasabi'), ('Horseradish')
ON CONFLICT (spice_name) DO NOTHING;

-- Функция для получения следующего доступного названия специи
CREATE OR REPLACE FUNCTION get_next_spice_name()
RETURNS VARCHAR(50) AS $$
DECLARE
    spice_name VARCHAR(50);
BEGIN
    -- Получаем первую неиспользованную специю
    SELECT ts.spice_name INTO spice_name
    FROM team_spice_names ts
    WHERE ts.is_used = FALSE
    ORDER BY ts.id
    LIMIT 1;
    
    -- Если все специи использованы, генерируем новую
    IF spice_name IS NULL THEN
        INSERT INTO team_spice_names (spice_name, is_used)
        VALUES ('Spice' || (SELECT COUNT(*) + 1 FROM team_spice_names), FALSE)
        RETURNING team_spice_names.spice_name INTO spice_name;
    END IF;
    
    RETURN spice_name;
END;
$$ LANGUAGE plpgsql;

-- Функция для назначения специи пользователю
CREATE OR REPLACE FUNCTION assign_spice_to_user(user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    spice_name VARCHAR(50);
    existing_spice VARCHAR(50);
BEGIN
    -- Проверяем, есть ли уже назначенная специя для этого пользователя
    SELECT ts.spice_name INTO existing_spice
    FROM team_spice_names ts
    WHERE ts.assigned_to_user_id = user_id AND ts.is_used = TRUE;
    
    IF existing_spice IS NOT NULL THEN
        RETURN existing_spice;
    END IF;
    
    -- Получаем новую специю
    SELECT get_next_spice_name() INTO spice_name;
    
    -- Назначаем специю пользователю
    UPDATE team_spice_names 
    SET is_used = TRUE, assigned_to_user_id = user_id
    WHERE spice_name = spice_name;
    
    RETURN spice_name;
END;
$$ LANGUAGE plpgsql;

-- Функция для освобождения специи при удалении Team Lead
CREATE OR REPLACE FUNCTION release_spice_from_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE team_spice_names 
    SET is_used = FALSE, assigned_to_user_id = NULL
    WHERE assigned_to_user_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Обновляем функцию синхронизации команд с новой системой названий
CREATE OR REPLACE FUNCTION sync_team_members()
RETURNS void AS $$
DECLARE
    team_record RECORD;
    user_record RECORD;
    current_user_id UUID;
    spice_name VARCHAR(50);
    team_name VARCHAR(100);
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
            
            -- Добавляем неназначенных Junior (только team_lead_id IS NULL)
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

    -- Деактивируем старые команды Team Lead с UUID в названии
    UPDATE teams 
    SET is_active = false 
    WHERE team_type = 'individual_lead' 
    AND name ~ 'Xbsidian Lead [0-9a-f-]{36} Team';

    -- Создаем индивидуальные команды для каждого Team Lead с красивыми названиями
    FOR user_record IN 
        SELECT * FROM users 
        WHERE status = 'active' 
        AND role = 'teamlead'
    LOOP
        -- Получаем или назначаем специю для Team Lead
        SELECT assign_spice_to_user(user_record.id) INTO spice_name;
        
        -- Формируем название команды
        team_name := 'Xbsidian TL ' || spice_name;
        
        -- Создаем или обновляем команду для Team Lead
        INSERT INTO teams (name, description, team_type, is_active, created_at, updated_at)
        VALUES (
            team_name,
            'Команда Team Lead: ' || user_record.first_name || ' ' || user_record.last_name || ' (' || spice_name || ')',
            'individual_lead',
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (name) DO UPDATE SET
            description = 'Команда Team Lead: ' || user_record.first_name || ' ' || user_record.last_name || ' (' || spice_name || ')',
            is_active = true,
            updated_at = NOW();
            
        -- Получаем ID созданной команды
        DECLARE
            team_lead_team_id UUID;
        BEGIN
            SELECT id INTO team_lead_team_id 
            FROM teams 
            WHERE name = team_name;
            
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
    
    -- Освобождаем специи от удаленных или неактивных Team Lead
    PERFORM release_spice_from_user(u.id)
    FROM users u
    WHERE u.id IN (
        SELECT ts.assigned_to_user_id 
        FROM team_spice_names ts 
        WHERE ts.assigned_to_user_id IS NOT NULL
        AND ts.assigned_to_user_id NOT IN (
            SELECT id FROM users WHERE role = 'teamlead' AND status = 'active'
        )
    );
    
END;
$$ LANGUAGE plpgsql;

-- Запускаем обновленную синхронизацию
SELECT sync_team_members();
