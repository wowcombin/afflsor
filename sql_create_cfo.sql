-- CFO ПОЛЬЗОВАТЕЛЬ: SQL для быстрого создания
-- Выполните этот код для создания CFO пользователя

-- CFO пользователь
INSERT INTO users (auth_id, email, role, status) 
VALUES ('8f947e16-d0a8-4272-878e-c484d347365c', 'yupiter871@gmail.com', 'cfo', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'yupiter871@gmail.com'
ORDER BY role;
