-- Скрипт создания пользователей для ERP системы
-- ВНИМАНИЕ: Выполнять ПОСЛЕ создания auth пользователей в Supabase Auth

-- Функция для создания пользователя в системе
CREATE OR REPLACE FUNCTION create_system_user(
  p_email VARCHAR(255),
  p_first_name VARCHAR(100),
  p_last_name VARCHAR(100),
  p_role user_role,
  p_salary_percentage NUMERIC DEFAULT 0.00,
  p_salary_bonus NUMERIC DEFAULT 0.00
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

  -- Создаем пользователя в нашей системе
  INSERT INTO users (
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    salary_percentage,
    salary_bonus
  ) VALUES (
    v_auth_id,
    p_email,
    p_first_name,
    p_last_name,
    p_role,
    'active',
    p_salary_percentage,
    p_salary_bonus
  ) RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ИНСТРУКЦИЯ ПО СОЗДАНИЮ ПОЛЬЗОВАТЕЛЕЙ:
-- 
-- 1. Сначала создайте пользователей в Supabase Auth:
--    Dashboard → Authentication → Users → Invite user
--    Или через SQL:
--    
--    INSERT INTO auth.users (
--      instance_id,
--      id,
--      aud,
--      role,
--      email,
--      encrypted_password,
--      email_confirmed_at,
--      confirmation_sent_at,
--      confirmation_token,
--      recovery_sent_at,
--      recovery_token,
--      email_change_sent_at,
--      email_change,
--      email_change_token_new,
--      email_change_token_current,
--      last_sign_in_at,
--      raw_app_meta_data,
--      raw_user_meta_data,
--      is_super_admin,
--      created_at,
--      updated_at,
--      phone,
--      phone_confirmed_at,
--      phone_change,
--      phone_change_token,
--      phone_change_sent_at,
--      email_change_confirm_status,
--      banned_until,
--      reauthentication_token,
--      reauthentication_sent_at,
--      is_sso_user,
--      deleted_at
--    ) VALUES (
--      '00000000-0000-0000-0000-000000000000',
--      gen_random_uuid(),
--      'authenticated',
--      'authenticated',
--      'dimkoxobbit87@gmail.com',
--      crypt('rTC9yt@GcrF4r7*', gen_salt('bf')),
--      NOW(),
--      NOW(),
--      '',
--      NULL,
--      '',
--      NULL,
--      '',
--      '',
--      '',
--      NULL,
--      '{"provider": "email", "providers": ["email"]}',
--      '{}',
--      FALSE,
--      NOW(),
--      NOW(),
--      NULL,
--      NULL,
--      '',
--      '',
--      NULL,
--      0,
--      NULL,
--      '',
--      NULL,
--      FALSE,
--      NULL
--    );
--
-- 2. Затем выполните команды ниже для создания пользователей в системе:

-- Создаем пользователей (выполнять ПОСЛЕ создания в auth.users)
SELECT create_system_user('dimkoxobbit87@gmail.com', 'Дима', 'Коваленко', 'junior', 15.00, 100.00);
SELECT create_system_user('pocformail@gmail.com', 'Менеджер', 'Петров', 'manager', 0.00, 500.00);
SELECT create_system_user('rezunenko1707@gmail.com', 'Тестер', 'Резуненко', 'tester', 0.00, 300.00);
SELECT create_system_user('yupiter871@gmail.com', 'CFO', 'Финансов', 'cfo', 0.00, 1000.00);
SELECT create_system_user('zavgorodni22@gmail.com', 'HR', 'Кадров', 'hr', 0.00, 800.00);
SELECT create_system_user('hjxklw@gmail.com', 'Админ', 'Главный', 'admin', 0.00, 1500.00);

-- Проверяем созданных пользователей
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  salary_percentage,
  salary_bonus,
  created_at
FROM users
ORDER BY role, email;
