-- Таблица аудита для всех действий
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для аудита
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);

-- Таблица расчета зарплат
CREATE TABLE salary_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    month DATE NOT NULL,
    gross_profit NUMERIC(10,2) DEFAULT 0,
    base_salary NUMERIC(10,2) DEFAULT 0,
    bonus NUMERIC(10,2) DEFAULT 0,
    total_salary NUMERIC(10,2) DEFAULT 0,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_salary_month UNIQUE (user_id, month)
);

-- Индекс для зарплат
CREATE INDEX idx_salary_user_month ON salary_calculations(user_id, month);
