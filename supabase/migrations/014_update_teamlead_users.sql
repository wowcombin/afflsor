-- Миграция 014: Создание пользователей с ролью Team Lead

-- Функция для создания пользователя Team Lead
CREATE OR REPLACE FUNCTION create_teamlead_user(
  p_email VARCHAR(255),
  p_first_name VARCHAR(100) DEFAULT 'Team',
  p_last_name VARCHAR(100) DEFAULT 'Lead',
  p_salary_percentage NUMERIC DEFAULT 15.00
) RETURNS UUID AS $$
DECLARE
  v_auth_id UUID;
  v_user_id UUID;
BEGIN
  -- Получаем auth_id из auth.users по email
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = p_email;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Пользователь с email % не найден в auth.users. Сначала создайте аккаунт в Supabase Auth.', p_email;
  END IF;

  -- Проверяем, не существует ли уже запись в users
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = v_auth_id;

  IF v_user_id IS NOT NULL THEN
    -- Обновляем существующего пользователя
    UPDATE users 
    SET role = 'teamlead',
        first_name = COALESCE(first_name, p_first_name),
        last_name = COALESCE(last_name, p_last_name),
        salary_percentage = p_salary_percentage,
        status = 'active'
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Пользователь % обновлен до роли teamlead', p_email;
    RETURN v_user_id;
  ELSE
    -- Создаем нового пользователя в нашей системе
    INSERT INTO users (
      auth_id,
      email,
      first_name,
      last_name,
      role,
      status,
      salary_percentage
    ) VALUES (
      v_auth_id,
      p_email,
      p_first_name,
      p_last_name,
      'teamlead',
      'active',
      p_salary_percentage
    ) RETURNING id INTO v_user_id;

    RAISE NOTICE 'Создан новый пользователь teamlead: %', p_email;
    RETURN v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ИНСТРУКЦИЯ:
-- 1. Замените 'your-email@domain.com' на реальный email из auth.users
-- 2. Раскомментируйте нужную строку ниже

-- Пример создания Team Lead (замените email на реальный):
-- SELECT create_teamlead_user('your-email@domain.com', 'Имя', 'Фамилия', 15.00);

-- Проверяем результат
SELECT 
  u.id, 
  u.first_name, 
  u.last_name, 
  u.email, 
  u.role, 
  u.status,
  u.salary_percentage,
  u.team_lead_id,
  au.email as auth_email
FROM users u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE u.role = 'teamlead' OR u.team_lead_id IS NOT NULL
ORDER BY u.role, u.created_at;
