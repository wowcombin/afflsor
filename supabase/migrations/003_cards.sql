-- Таблица карт (публичные данные)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    card_number_mask VARCHAR(25),
    card_bin VARCHAR(6),
    card_last4 VARCHAR(4),
    exp_month INTEGER CHECK (exp_month BETWEEN 1 AND 12),
    exp_year INTEGER CHECK (exp_year >= 2024),
    type card_type DEFAULT 'grey',
    status card_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица секретов карт (зашифрованные данные)
CREATE TABLE card_secrets (
    card_id UUID PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    pan_enc TEXT NOT NULL,
    cvv_enc TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Назначения карт
CREATE TABLE card_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id),
    casino_id UUID NOT NULL,
    junior_id UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'assigned',
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_cards_bank_account ON cards(bank_account_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_assignments_junior ON card_assignments(junior_id);
