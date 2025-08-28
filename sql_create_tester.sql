-- TESTER ПОЛЬЗОВАТЕЛЬ: SQL для быстрого создания
-- Выполните этот код для создания Tester пользователя

-- Tester пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('854c82c7-ad11-4cd2-bed7-bac7c340e52f', 'rezunenko1707@gmail.com', 'tester', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'rezunenko1707@gmail.com'
ORDER BY role;
