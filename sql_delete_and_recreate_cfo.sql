-- УДАЛЕНИЕ И ПЕРЕСОЗДАНИЕ CFO ПОЛЬЗОВАТЕЛЯ
-- Выполните этот код если хотите полностью пересоздать пользователя

-- 1. Удаляем неправильную запись
DELETE FROM users 
WHERE email = 'yupiter871@gmail.com';

-- Альтернативно - удаление по auth_id
-- DELETE FROM users WHERE auth_id = '8f947e16-d0a8-4272-878e-c484d347365c';

-- 2. Создаем правильную запись CFO
INSERT INTO users (auth_id, email, role, status) 
VALUES ('8f947e16-d0a8-4272-878e-c484d347365c', 'yupiter871@gmail.com', 'cfo', 'active');

-- 3. Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'yupiter871@gmail.com';
