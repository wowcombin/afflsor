-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role role_type NOT NULL DEFAULT 'junior',
    status user_status NOT NULL DEFAULT 'active',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    telegram_username VARCHAR(100),
    usdt_wallet VARCHAR(100),
    salary_percentage NUMERIC(5,2) DEFAULT 10,
    salary_bonus NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица банков
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    country VARCHAR(2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица банковских аккаунтов (КРИТИЧНО: balance >= 10)
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id),
    holder_name VARCHAR(255) NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0 CHECK (balance >= 0),
    balance_updated_at TIMESTAMPTZ,
    balance_updated_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_role ON users(role) WHERE status = 'active';
CREATE INDEX idx_bank_accounts_balance ON bank_accounts(balance) WHERE status = 'active';
