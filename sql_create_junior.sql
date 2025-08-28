-- JUNIOR ПОЛЬЗОВАТЕЛЬ: SQL для быстрого создания
-- Выполните этот код для создания Junior пользователя

-- Junior пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('78d65daf-7d0f-486c-ae0f-8b0639fb2db2', 'dimkoxobbit87@gmail.com', 'junior', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'dimkoxobbit87@gmail.com'
ORDER BY role;
