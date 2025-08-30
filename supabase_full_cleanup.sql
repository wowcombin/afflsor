-- ПОЛНАЯ ОЧИСТКА ВСЕХ СХЕМ SUPABASE
-- ⚠️ ВНИМАНИЕ: Это удалит ВСЕ данные и структуры!

-- 1. УДАЛЯЕМ ВСЕ ИЗ СХЕМЫ PUBLIC
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Отключаем RLS для всех таблиц
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
    
    -- Удаляем все представления
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') 
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
    
    -- Удаляем все материализованные представления
    FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
    END LOOP;
    
    -- Удаляем все функции
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
    
    -- Удаляем все процедуры
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'PROCEDURE') 
    LOOP
        EXECUTE 'DROP PROCEDURE IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
    
    -- Удаляем все таблицы
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Удаляем все последовательности
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Удаляем все типы
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') 
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
    
END $$;

-- 2. УДАЛЯЕМ ПОЛЬЗОВАТЕЛЬСКИЕ СХЕМЫ (кроме системных)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN (
            'information_schema', 
            'pg_catalog', 
            'pg_toast', 
            'pg_temp_1', 
            'pg_toast_temp_1',
            'auth',
            'extensions',
            'graphql',
            'graphql_public',
            'pgbouncer',
            'realtime',
            'storage',
            'vault',
            'supabase_functions'
        )
        AND schema_name NOT LIKE 'pg_%'
    ) 
    LOOP
        IF r.schema_name != 'public' THEN
            EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
        END IF;
    END LOOP;
END $$;

-- 3. ОЧИЩАЕМ SUPABASE AUTH (удаляем всех пользователей)
-- ВНИМАНИЕ: Это удалит всех пользователей включая вас!
DELETE FROM auth.users;

-- 4. ОЧИЩАЕМ STORAGE (если используется)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT name FROM storage.buckets) 
    LOOP
        EXECUTE 'DELETE FROM storage.objects WHERE bucket_id = ' || quote_literal(r.name);
        EXECUTE 'DELETE FROM storage.buckets WHERE name = ' || quote_literal(r.name);
    END LOOP;
END $$;

-- 5. ОЧИЩАЕМ REALTIME
DELETE FROM realtime.subscription;
DELETE FROM realtime.schema_migrations;

-- 6. СБРОС АВТОИНКРЕМЕНТОВ И ПОСЛЕДОВАТЕЛЬНОСТЕЙ
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP
        EXECUTE 'ALTER SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
    END LOOP;
END $$;

-- ПРОВЕРКА РЕЗУЛЬТАТА
SELECT 'TABLES' as type, table_name as name FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT 'VIEWS' as type, table_name as name FROM information_schema.views WHERE table_schema = 'public'
UNION ALL
SELECT 'FUNCTIONS' as type, routine_name as name FROM information_schema.routines WHERE routine_schema = 'public'
UNION ALL
SELECT 'SCHEMAS' as type, schema_name as name FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'realtime', 'storage', 'vault')
ORDER BY type, name;

-- Если все прошло успешно, должны остаться только системные схемы и пустая схема public
