-- ЧАСТЬ 1: Добавление новых enum значений
-- Выполните эту часть первой, затем COMMIT

-- Добавление tester роли в enum
ALTER TYPE role_type ADD VALUE 'tester';

-- Добавление статусов для казино и тестов
CREATE TYPE casino_status AS ENUM ('pending', 'testing', 'approved', 'rejected', 'maintenance');
CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
