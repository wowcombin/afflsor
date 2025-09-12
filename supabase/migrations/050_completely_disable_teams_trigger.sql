-- Полное отключение триггера синхронизации команд для исправления RLS
-- Миграция 050: Временное отключение проблемного триггера

-- Полностью удаляем триггер
DROP TRIGGER IF EXISTS sync_teams_on_user_change ON users;

-- Создаем функцию-заглушку для безопасности
CREATE OR REPLACE FUNCTION trigger_sync_team_members_disabled()
RETURNS TRIGGER AS $$
BEGIN
    -- Ничего не делаем, просто возвращаем результат
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к изменениям
COMMENT ON FUNCTION trigger_sync_team_members_disabled() IS 'Отключенная функция синхронизации команд для избежания RLS конфликтов при обновлении пользователей';
