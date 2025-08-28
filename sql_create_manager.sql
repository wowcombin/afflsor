-- MANAGER ПОЛЬЗОВАТЕЛЬ: SQL для быстрого создания
-- Выполните этот код для создания Manager пользователя

-- Manager пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('aa58b8ef-a514-4242-863a-57c3ec578a26', 'pocformail@gmail.com', 'manager', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'pocformail@gmail.com'
ORDER BY role;
