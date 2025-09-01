-- Временное отключение RLS для отладки
-- Выполните это в Supabase SQL Editor

-- Отключаем RLS для таблицы users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Проверяем что RLS отключен
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- Тестируем запрос
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM users 
ORDER BY role, email;
