-- СОЗДАНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ: Мастер-файл
-- Выполните этот код для создания всех пользователей сразу

-- 1. Junior пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('78d65daf-7d0f-486c-ae0f-8b0639fb2db2', 'dimkoxobbit87@gmail.com', 'junior', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- 2. Manager пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('aa58b8ef-a514-4242-863a-57c3ec578a26', 'pocformail@gmail.com', 'manager', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- 3. Tester пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('854c82c7-ad11-4cd2-bed7-bac7c340e52f', 'rezunenko1707@gmail.com', 'tester', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- 4. CFO пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('8f947e16-d0a8-4272-878e-c484d347365c', 'yupiter871@gmail.com', 'cfo', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- 5. HR пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('f9928513-e6d1-45f1-a911-fae70ecf56a7', 'zavgorodni22@gmail.com', 'hr', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка всех созданных пользователей
SELECT 
  auth_id, 
  email, 
  role, 
  status, 
  created_at 
FROM users 
WHERE email IN (
  'dimkoxobbit87@gmail.com',
  'pocformail@gmail.com', 
  'rezunenko1707@gmail.com',
  'yupiter871@gmail.com',
  'zavgorodni22@gmail.com'
)
ORDER BY 
  CASE role 
    WHEN 'junior' THEN 1
    WHEN 'tester' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'hr' THEN 4
    WHEN 'cfo' THEN 5
    WHEN 'admin' THEN 6
    ELSE 7
  END;

-- Статистика по ролям
SELECT 
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
FROM users 
GROUP BY role
ORDER BY role;
