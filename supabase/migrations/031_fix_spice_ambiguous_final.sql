-- Окончательное исправление неоднозначности колонки spice_name

-- Пересоздаем функцию assign_spice_to_user с полным исправлением
CREATE OR REPLACE FUNCTION assign_spice_to_user(user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    selected_spice_name VARCHAR(50);
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
    SELECT get_next_spice_name() INTO selected_spice_name;
    
    -- Назначаем специю пользователю (явно указываем таблицу)
    UPDATE team_spice_names 
    SET is_used = TRUE, assigned_to_user_id = user_id
    WHERE team_spice_names.spice_name = selected_spice_name;
    
    RETURN selected_spice_name;
END;
$$ LANGUAGE plpgsql;
