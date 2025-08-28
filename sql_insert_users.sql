-- SQL код для добавления новых пользователей в ERP систему
-- Выполните этот код в Supabase SQL Editor

-- 1. Junior пользователь
INSERT INTO users (
  auth_id, 
  email, 
  role, 
  status, 
  first_name, 
  last_name, 
  salary_percentage, 
  salary_bonus,
  created_at
) VALUES (
  '78d65daf-7d0f-486c-ae0f-8b0639fb2db2',
  'dimkoxobbit87@gmail.com',
  'junior',
  'active',
  'Дмитрий',
  'Коваленко',
  10.00,
  0.00,
  NOW()
) ON CONFLICT (auth_id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  salary_percentage = EXCLUDED.salary_percentage,
  salary_bonus = EXCLUDED.salary_bonus;

-- 2. Manager пользователь
INSERT INTO users (
  auth_id, 
  email, 
  role, 
  status, 
  first_name, 
  last_name, 
  salary_percentage, 
  salary_bonus,
  created_at
) VALUES (
  'aa58b8ef-a514-4242-863a-57c3ec578a26',
  'pocformail@gmail.com',
  'manager',
  'active',
  'Александр',
  'Менеджеров',
  15.00,
  500.00,
  NOW()
) ON CONFLICT (auth_id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  salary_percentage = EXCLUDED.salary_percentage,
  salary_bonus = EXCLUDED.salary_bonus;

-- 3. Tester пользователь
INSERT INTO users (
  auth_id, 
  email, 
  role, 
  status, 
  first_name, 
  last_name, 
  salary_percentage, 
  salary_bonus,
  created_at
) VALUES (
  '854c82c7-ad11-4cd2-bed7-bac7c340e52f',
  'rezunenko1707@gmail.com',
  'tester',
  'active',
  'Роман',
  'Резуненко',
  12.00,
  300.00,
  NOW()
) ON CONFLICT (auth_id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  salary_percentage = EXCLUDED.salary_percentage,
  salary_bonus = EXCLUDED.salary_bonus;

-- 4. CFO пользователь
INSERT INTO users (
  auth_id, 
  email, 
  role, 
  status, 
  first_name, 
  last_name, 
  salary_percentage, 
  salary_bonus,
  created_at
) VALUES (
  '8f947e16-d0a8-4272-878e-c484d347365c',
  'yupiter871@gmail.com',
  'cfo',
  'active',
  'Юрий',
  'Финансов',
  20.00,
  1000.00,
  NOW()
) ON CONFLICT (auth_id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  salary_percentage = EXCLUDED.salary_percentage,
  salary_bonus = EXCLUDED.salary_bonus;

-- 5. HR пользователь (тот же email что и CFO, но другая роль)
-- Примечание: Один человек может иметь несколько ролей, создаем отдельную запись
INSERT INTO users (
  auth_id, 
  email, 
  role, 
  status, 
  first_name, 
  last_name, 
  salary_percentage, 
  salary_bonus,
  created_at
) VALUES (
  '9f947e16-d0a8-4272-878e-c484d347365c', -- Новый валидный UUID (изменена первая цифра)
  'yupiter871@gmail.com',
  'hr',
  'active',
  'Юрий',
  'Кадровик',
  18.00,
  800.00,
  NOW()
) ON CONFLICT (auth_id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  salary_percentage = EXCLUDED.salary_percentage,
  salary_bonus = EXCLUDED.salary_bonus;

-- Проверяем результат
SELECT 
  auth_id,
  email,
  role,
  status,
  first_name,
  last_name,
  salary_percentage,
  salary_bonus,
  created_at
FROM users 
WHERE email IN (
  'dimkoxobbit87@gmail.com',
  'pocformail@gmail.com', 
  'rezunenko1707@gmail.com',
  'yupiter871@gmail.com'
)
ORDER BY role, created_at;

-- Дополнительно: Проверяем общее количество пользователей по ролям
SELECT 
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM users 
GROUP BY role
ORDER BY role;
