-- Таблица казино
CREATE TABLE casinos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    allowed_bins TEXT[],
    manual TEXT,
    auto_approve_limit NUMERIC(10,2) DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица работ (депозитов)
CREATE TABLE works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    junior_id UUID NOT NULL REFERENCES users(id),
    casino_id UUID NOT NULL REFERENCES casinos(id),
    card_id UUID NOT NULL REFERENCES cards(id),
    deposit_amount NUMERIC(10,2) NOT NULL CHECK (deposit_amount > 0),
    casino_username VARCHAR(100),
    casino_password TEXT,
    status work_status DEFAULT 'active',
    work_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица выводов (КРИТИЧНО: статусы и проверка)
CREATE TABLE work_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID NOT NULL REFERENCES works(id),
    withdrawal_amount NUMERIC(10,2) CHECK (withdrawal_amount > 0),
    status withdrawal_status NOT NULL DEFAULT 'new',
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMPTZ,
    alarm_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для очереди проверки
CREATE INDEX idx_withdrawals_status ON work_withdrawals(status);
CREATE INDEX idx_withdrawals_queue ON work_withdrawals(status, created_at) 
    WHERE status IN ('new', 'waiting');
