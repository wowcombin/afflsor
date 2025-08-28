-- ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЕЙ
-- Выполните этот код чтобы увидеть что у вас есть в базе

-- Проверяем конкретного пользователя yupiter871@gmail.com
SELECT 
  auth_id, 
  email, 
  role, 
  status, 
  first_name, 
  last_name,
  created_at 
FROM users 
WHERE email = 'yupiter871@gmail.com'
ORDER BY created_at;

-- Проверяем всех пользователей
SELECT 
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
ORDER BY email, role;

-- Статистика по ролям
SELECT 
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM users 
GROUP BY role
ORDER BY role;
