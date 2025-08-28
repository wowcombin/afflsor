-- УПРОЩЕННАЯ ВЕРСИЯ: SQL код для добавления пользователей
-- Выполните в Supabase SQL Editor

-- Junior
INSERT INTO users (auth_id, email, role, status) 
VALUES ('78d65daf-7d0f-486c-ae0f-8b0639fb2db2', 'dimkoxobbit87@gmail.com', 'junior', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Manager  
INSERT INTO users (auth_id, email, role, status) 
VALUES ('aa58b8ef-a514-4242-863a-57c3ec578a26', 'pocformail@gmail.com', 'manager', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Tester
INSERT INTO users (auth_id, email, role, status) 
VALUES ('854c82c7-ad11-4cd2-bed7-bac7c340e52f', 'rezunenko1707@gmail.com', 'tester', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- CFO
INSERT INTO users (auth_id, email, role, status) 
VALUES ('8f947e16-d0a8-4272-878e-c484d347365c', 'yupiter871@gmail.com', 'cfo', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- HR (отдельная запись с модифицированным auth_id)
INSERT INTO users (auth_id, email, role, status) 
VALUES ('8f947e16-d0a8-4272-878e-c484d347365c-hr', 'yupiter871@gmail.com', 'hr', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email IN ('dimkoxobbit87@gmail.com', 'pocformail@gmail.com', 'rezunenko1707@gmail.com', 'yupiter871@gmail.com')
ORDER BY email, role;
