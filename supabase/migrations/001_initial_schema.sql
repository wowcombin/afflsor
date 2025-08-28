-- Создание основных типов
CREATE TYPE role_type AS ENUM ('junior', 'manager', 'hr', 'cfo', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'terminated');
CREATE TYPE card_status AS ENUM ('active', 'blocked', 'expired', 'temporarily_unavailable');
CREATE TYPE card_type AS ENUM ('grey', 'pink');
CREATE TYPE withdrawal_status AS ENUM ('new', 'waiting', 'received', 'problem', 'block');
CREATE TYPE work_status AS ENUM ('active', 'completed', 'cancelled');

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
