-- Скрипт полной очистки базы данных Supabase
-- ВНИМАНИЕ: Это действие НЕОБРАТИМО! Все данные будут удалены.

-- Отключаем RLS для всех таблиц (если они существуют)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- Удаляем все представления
DROP VIEW IF EXISTS active_nda_requests CASCADE;
DROP VIEW IF EXISTS available_cards_for_junior CASCADE;
DROP VIEW IF EXISTS junior_monthly_stats CASCADE;
DROP VIEW IF EXISTS employee_statistics CASCADE;
DROP VIEW IF EXISTS active_withdrawals CASCADE;

-- Удаляем все триггеры
DROP TRIGGER IF EXISTS trg_casino_updated_at ON casinos;
DROP TRIGGER IF EXISTS trg_bank_balance_change ON bank_accounts;
DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
DROP TRIGGER IF EXISTS trg_nda_templates_updated_at ON nda_templates;
DROP TRIGGER IF EXISTS trg_external_nda_requests_updated_at ON external_nda_requests;
DROP TRIGGER IF EXISTS trg_send_push ON notifications;

-- Удаляем все функции
DROP FUNCTION IF EXISTS update_casino_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_bank_balance() CASCADE;
DROP FUNCTION IF EXISTS handle_balance_change() CASCADE;
DROP FUNCTION IF EXISTS update_bank_accounts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_nda_token() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_nda_tokens() CASCADE;
DROP FUNCTION IF EXISTS update_nda_template_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_external_nda_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS send_push_notification() CASCADE;
DROP FUNCTION IF EXISTS auto_expire_cards() CASCADE;
DROP FUNCTION IF EXISTS escalate_pending_withdrawals() CASCADE;
DROP FUNCTION IF EXISTS calculate_daily_stats() CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_salaries() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_data() CASCADE;
DROP FUNCTION IF EXISTS rotate_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS detect_anomalies() CASCADE;
DROP FUNCTION IF EXISTS monitor_system_health() CASCADE;
DROP FUNCTION IF EXISTS auto_backup() CASCADE;
DROP FUNCTION IF EXISTS send_task_reminders() CASCADE;

-- Удаляем все таблицы в правильном порядке (учитывая foreign key зависимости)

-- Таблицы логов и истории
DROP TABLE IF EXISTS cvv_access_log CASCADE;
DROP TABLE IF EXISTS bank_balance_history CASCADE;
DROP TABLE IF EXISTS casino_bin_history CASCADE;
DROP TABLE IF EXISTS nda_revocation_log CASCADE;
DROP TABLE IF EXISTS nda_view_logs CASCADE;
DROP TABLE IF EXISTS external_nda_view_logs CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS audit_log_archive CASCADE;
DROP TABLE IF EXISTS access_attempts CASCADE;
DROP TABLE IF EXISTS access_attempts_archive CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS backup_history CASCADE;

-- Таблицы подписей и связанных данных
DROP TABLE IF EXISTS nda_signatures CASCADE;
DROP TABLE IF EXISTS external_nda_signatures CASCADE;
DROP TABLE IF EXISTS task_assignees CASCADE;

-- Таблицы операций
DROP TABLE IF EXISTS work_withdrawals CASCADE;
DROP TABLE IF EXISTS works CASCADE;
DROP TABLE IF EXISTS works_history CASCADE;
DROP TABLE IF EXISTS casino_tests CASCADE;
DROP TABLE IF EXISTS salary_calculations CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS usdt_transfers CASCADE;
DROP TABLE IF EXISTS daily_limits CASCADE;

-- Таблицы токенов и сессий
DROP TABLE IF EXISTS nda_tokens CASCADE;
DROP TABLE IF EXISTS external_nda_requests CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS card_reveal_tokens CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;

-- Таблицы назначений и связей
DROP TABLE IF EXISTS card_assignments CASCADE;

-- Основные таблицы сущностей
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS card_secrets CASCADE;
DROP TABLE IF EXISTS casinos CASCADE;
DROP TABLE IF EXISTS casino_manuals CASCADE;
DROP TABLE IF EXISTS nda_templates CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS pink_cards_daily CASCADE;

-- Таблицы банков
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS banks CASCADE;

-- Таблица пользователей (последняя)
DROP TABLE IF EXISTS users CASCADE;

-- Удаляем все типы (enums)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS card_status CASCADE;
DROP TYPE IF EXISTS work_status CASCADE;
DROP TYPE IF EXISTS withdrawal_status CASCADE;
DROP TYPE IF EXISTS casino_status CASCADE;
DROP TYPE IF EXISTS test_status CASCADE;
DROP TYPE IF EXISTS withdrawal_time_unit CASCADE;

-- Проверяем что все удалено
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Проверяем функции
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Проверяем типы
SELECT 
    typname as type_name
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype = 'e'
ORDER BY typname;
