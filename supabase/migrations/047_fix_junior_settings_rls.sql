-- Исправление RLS проблемы для настроек Junior пользователей
-- Миграция 047: Исправление доступа Junior к обновлению своих данных

-- Создаем безопасную функцию синхронизации команд, которая не нарушает RLS
CREATE OR REPLACE FUNCTION trigger_sync_team_members_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, есть ли у текущего пользователя права на работу с командами
    -- Если нет (например, Junior), просто пропускаем синхронизацию
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'manager', 'hr', 'teamlead')
    ) THEN
        -- Только для пользователей с правами администрирования запускаем синхронизацию
        PERFORM sync_team_members();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем триггер для использования безопасной функции
DROP TRIGGER IF EXISTS sync_teams_on_user_change ON users;
CREATE TRIGGER sync_teams_on_user_change
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_team_members_safe();

-- Добавляем RLS политику для Junior пользователей на чтение teams (только для синхронизации)
CREATE POLICY "junior_teams_read_own" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN users u ON u.id = tm.user_id
            WHERE u.auth_id = auth.uid() 
            AND u.role = 'junior'
            AND tm.team_id = teams.id
            AND tm.is_active = true
        )
    );

-- Комментарий к изменениям
COMMENT ON FUNCTION trigger_sync_team_members_safe() IS 'Безопасная функция синхронизации команд, которая не нарушает RLS для Junior пользователей';
