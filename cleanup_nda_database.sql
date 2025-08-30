-- Скрипт для полного удаления NDA системы из Supabase
-- ВНИМАНИЕ: Это действие необратимо! Все данные NDA будут удалены.

-- Удаляем представления
DROP VIEW IF EXISTS active_nda_requests CASCADE;

-- Удаляем триггеры
DROP TRIGGER IF EXISTS trg_nda_templates_updated_at ON nda_templates;
DROP TRIGGER IF EXISTS trg_external_nda_requests_updated_at ON external_nda_requests;

-- Удаляем функции
DROP FUNCTION IF EXISTS generate_nda_token();
DROP FUNCTION IF EXISTS cleanup_expired_nda_tokens();
DROP FUNCTION IF EXISTS update_nda_template_updated_at();
DROP FUNCTION IF EXISTS update_external_nda_requests_updated_at();

-- Удаляем таблицы (в правильном порядке, учитывая foreign key связи)

-- 1. Таблицы с подписями (зависят от токенов и шаблонов)
DROP TABLE IF EXISTS nda_signatures CASCADE;
DROP TABLE IF EXISTS external_nda_signatures CASCADE;

-- 2. Таблицы с логами (зависят от токенов)
DROP TABLE IF EXISTS nda_view_logs CASCADE;
DROP TABLE IF EXISTS external_nda_view_logs CASCADE;
DROP TABLE IF EXISTS nda_revocation_log CASCADE;

-- 3. Таблицы с токенами (зависят от пользователей и шаблонов)
DROP TABLE IF EXISTS nda_tokens CASCADE;
DROP TABLE IF EXISTS external_nda_requests CASCADE;

-- 4. Таблицы шаблонов (зависят от пользователей)
DROP TABLE IF EXISTS nda_templates CASCADE;

-- Проверяем, что все удалено
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%nda%'
ORDER BY table_name;

-- Проверяем функции
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%nda%'
ORDER BY routine_name;
