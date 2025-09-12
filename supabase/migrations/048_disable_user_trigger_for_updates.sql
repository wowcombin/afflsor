-- Временно отключаем триггер синхронизации команд для обновлений пользователей
-- Миграция 048: Отключение триггера для исправления RLS проблемы

-- Удаляем проблемный триггер
DROP TRIGGER IF EXISTS sync_teams_on_user_change ON users;

-- Создаем новый триггер только для INSERT и DELETE (не UPDATE)
CREATE TRIGGER sync_teams_on_user_change
    AFTER INSERT OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_team_members_safe();

-- Комментарий к изменениям
COMMENT ON TRIGGER sync_teams_on_user_change ON users IS 'Триггер синхронизации команд только для создания и удаления пользователей, исключая обновления для избежания RLS конфликтов';
