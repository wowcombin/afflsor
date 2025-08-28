-- ИСПРАВЛЕНИЕ РОЛИ CFO ПОЛЬЗОВАТЕЛЯ
-- Выполните этот код если случайно создали CFO как HR

-- Исправляем роль с HR на CFO
UPDATE users 
SET role = 'cfo', status = 'active'
WHERE auth_id = '8f947e16-d0a8-4272-878e-c484d347365c' 
  AND email = 'yupiter871@gmail.com';

-- Альтернативный способ - по email
UPDATE users 
SET role = 'cfo', status = 'active'
WHERE email = 'yupiter871@gmail.com';

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'yupiter871@gmail.com'
ORDER BY created_at DESC;
