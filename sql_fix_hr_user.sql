-- ИСПРАВЛЕНИЕ: SQL для HR пользователя с валидным UUID
-- Выполните этот код если получили ошибку с предыдущим HR UUID

-- HR пользователь с исправленным UUID
INSERT INTO users (auth_id, email, role, status) 
VALUES ('9f947e16-d0a8-4272-878e-c484d347365c', 'yupiter871@gmail.com', 'hr', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'yupiter871@gmail.com'
ORDER BY role;
