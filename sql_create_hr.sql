-- HR ПОЛЬЗОВАТЕЛЬ: SQL с правильными данными
-- Выполните этот код для создания HR пользователя

-- HR пользователь с правильными данными
INSERT INTO users (auth_id, email, role, status) 
VALUES ('f9928513-e6d1-45f1-a911-fae70ecf56a7', 'zavgorodni22@gmail.com', 'hr', 'active')
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Проверка результата
SELECT auth_id, email, role, status, created_at 
FROM users 
WHERE email = 'zavgorodni22@gmail.com'
ORDER BY role;
