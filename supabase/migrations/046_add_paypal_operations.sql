-- Создание таблицы для отслеживания операций PayPal
CREATE TABLE IF NOT EXISTS paypal_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paypal_account_id UUID NOT NULL REFERENCES paypal_accounts(id) ON DELETE CASCADE,
    junior_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
        'send_money',           -- Отправка денег на другой PayPal
        'receive_money',        -- Получение денег с другого PayPal
        'withdraw_to_card',     -- Вывод на карту
        'deposit_from_card',    -- Пополнение с карты
        'casino_deposit',       -- Депозит в казино
        'casino_withdrawal'     -- Вывод из казино
    )),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Детали операции
    recipient_paypal_email VARCHAR(255), -- Для отправки/получения денег
    recipient_card_number VARCHAR(255),  -- Для вывода на карту (зашифровано)
    casino_name VARCHAR(255),           -- Для операций с казино
    
    -- Статус операции
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- В ожидании
        'processing',   -- Обрабатывается
        'completed',    -- Завершена
        'failed',       -- Не удалась
        'cancelled'     -- Отменена
    )),
    
    -- Дополнительная информация
    description TEXT,
    transaction_id VARCHAR(255), -- ID транзакции в PayPal
    fee_amount DECIMAL(15,2) DEFAULT 0, -- Комиссия
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_paypal_operations_paypal_account_id ON paypal_operations(paypal_account_id);
CREATE INDEX IF NOT EXISTS idx_paypal_operations_junior_id ON paypal_operations(junior_id);
CREATE INDEX IF NOT EXISTS idx_paypal_operations_operation_type ON paypal_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_paypal_operations_status ON paypal_operations(status);
CREATE INDEX IF NOT EXISTS idx_paypal_operations_created_at ON paypal_operations(created_at);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_paypal_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paypal_operations_updated_at
    BEFORE UPDATE ON paypal_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_paypal_operations_updated_at();

-- RLS политики
ALTER TABLE paypal_operations ENABLE ROW LEVEL SECURITY;

-- Junior может видеть только свои операции
CREATE POLICY "junior_see_own_paypal_operations" ON paypal_operations
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE id = junior_id AND role = 'junior' AND status = 'active'
        )
    );

-- Junior может создавать операции для своих PayPal аккаунтов
CREATE POLICY "junior_create_paypal_operations" ON paypal_operations
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE id = junior_id AND role = 'junior' AND status = 'active'
        )
        AND paypal_account_id IN (
            SELECT id FROM paypal_accounts 
            WHERE junior_id = (
                SELECT id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- Junior может обновлять только статус своих операций
CREATE POLICY "junior_update_own_paypal_operations" ON paypal_operations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE id = junior_id AND role = 'junior' AND status = 'active'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE id = junior_id AND role = 'junior' AND status = 'active'
        )
    );

-- Manager, HR, CFO, Admin могут видеть все операции
CREATE POLICY "management_see_all_paypal_operations" ON paypal_operations
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'teamlead', 'hr', 'cfo', 'admin') 
            AND status = 'active'
        )
    );

-- Manager, HR, CFO, Admin могут обновлять операции
CREATE POLICY "management_update_paypal_operations" ON paypal_operations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'teamlead', 'hr', 'cfo', 'admin') 
            AND status = 'active'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('manager', 'teamlead', 'hr', 'cfo', 'admin') 
            AND status = 'active'
        )
    );

-- Функция для создания операции PayPal
CREATE OR REPLACE FUNCTION create_paypal_operation(
    p_paypal_account_id UUID,
    p_operation_type VARCHAR(50),
    p_amount DECIMAL(15,2),
    p_currency VARCHAR(3) DEFAULT 'USD',
    p_recipient_paypal_email VARCHAR(255) DEFAULT NULL,
    p_recipient_card_number VARCHAR(255) DEFAULT NULL,
    p_casino_name VARCHAR(255) DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_junior_id UUID;
    v_operation_id UUID;
BEGIN
    -- Получаем ID Junior из PayPal аккаунта
    SELECT junior_id INTO v_junior_id
    FROM paypal_accounts
    WHERE id = p_paypal_account_id;
    
    IF v_junior_id IS NULL THEN
        RAISE EXCEPTION 'PayPal аккаунт не найден';
    END IF;
    
    -- Создаем операцию
    INSERT INTO paypal_operations (
        paypal_account_id,
        junior_id,
        operation_type,
        amount,
        currency,
        recipient_paypal_email,
        recipient_card_number,
        casino_name,
        description
    ) VALUES (
        p_paypal_account_id,
        v_junior_id,
        p_operation_type,
        p_amount,
        p_currency,
        p_recipient_paypal_email,
        p_recipient_card_number,
        p_casino_name,
        p_description
    ) RETURNING id INTO v_operation_id;
    
    RETURN v_operation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для обновления баланса PayPal после операции
CREATE OR REPLACE FUNCTION update_paypal_balance_after_operation()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем баланс только при завершении операции
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        CASE NEW.operation_type
            WHEN 'send_money', 'withdraw_to_card', 'casino_deposit' THEN
                -- Списываем с баланса (включая комиссию)
                UPDATE paypal_accounts 
                SET balance = balance - (NEW.amount + COALESCE(NEW.fee_amount, 0))
                WHERE id = NEW.paypal_account_id;
                
            WHEN 'receive_money', 'deposit_from_card', 'casino_withdrawal' THEN
                -- Пополняем баланс (за вычетом комиссии)
                UPDATE paypal_accounts 
                SET balance = balance + (NEW.amount - COALESCE(NEW.fee_amount, 0))
                WHERE id = NEW.paypal_account_id;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paypal_balance_after_operation
    AFTER UPDATE ON paypal_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_paypal_balance_after_operation();

-- Добавляем комментарий к таблице
COMMENT ON TABLE paypal_operations IS 'Операции с PayPal аккаунтами: отправка/получение денег, выводы на карты, операции с казино';
