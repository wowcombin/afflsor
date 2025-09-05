-- Миграция 014: Обновление пользователей с ролью Team Lead

-- Теперь можно безопасно использовать новое значение enum
-- UPDATE users SET role = 'teamlead' WHERE email = 'your-teamlead@example.com';

-- Пример создания тестового Team Lead (раскомментировать и изменить email)
-- UPDATE users SET role = 'teamlead' WHERE email = 'teamlead@test.com';

-- Проверяем обновления
SELECT id, first_name, last_name, email, role, team_lead_id 
FROM users 
WHERE role = 'teamlead' OR team_lead_id IS NOT NULL
ORDER BY role, created_at;
