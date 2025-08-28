-- КРИТИЧЕСКИ ВАЖНЫЙ ТРИГГЕР: скрытие карт при балансе < 10
CREATE OR REPLACE FUNCTION handle_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Баланс упал ниже $10
    IF NEW.balance < 10 AND OLD.balance >= 10 THEN
        -- Меняем статус назначений на временно недоступные
        UPDATE card_assignments ca
        SET status = 'temporarily_unavailable'
        FROM cards c
        WHERE c.id = ca.card_id
            AND c.bank_account_id = NEW.id
            AND ca.status = 'assigned';
    
    -- Баланс восстановлен
    ELSIF NEW.balance >= 10 AND OLD.balance < 10 THEN
        -- Восстанавливаем доступность карт
        UPDATE card_assignments ca
        SET status = 'assigned'
        FROM cards c
        WHERE c.id = ca.card_id
            AND c.bank_account_id = NEW.id
            AND ca.status = 'temporarily_unavailable';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер
CREATE TRIGGER trg_balance_change
AFTER UPDATE OF balance ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION handle_balance_change();

-- Представление доступных карт (с учетом баланса >= 10)
CREATE OR REPLACE VIEW available_cards_for_junior AS
SELECT 
    c.*,
    ca.junior_id,
    ca.casino_id,
    ba.balance as bank_balance,
    CASE 
        WHEN ba.balance >= 10 THEN TRUE
        ELSE FALSE
    END as is_available
FROM cards c
JOIN card_assignments ca ON ca.card_id = c.id
JOIN bank_accounts ba ON ba.id = c.bank_account_id
WHERE c.status = 'active'
    AND ca.status IN ('assigned', 'in_use')
    AND ba.status = 'active';
