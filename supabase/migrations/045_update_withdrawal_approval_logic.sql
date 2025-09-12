-- Миграция 045: Обновление логики проверки выводов
-- TeamLead проверяет выводы своих Junior, Manager/HR/CFO могут блокировать любые выводы

-- Обновляем функцию проверки выводов
CREATE OR REPLACE FUNCTION check_withdrawal_safe_v3(
    p_withdrawal_id UUID,
    p_checker_id UUID,
    p_new_status withdrawal_status,
    p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_withdrawal RECORD;
    v_old_status withdrawal_status;
    v_checker_role TEXT;
    v_junior_teamlead_id UUID;
    v_work_junior_id UUID;
BEGIN
    -- Получаем текущий статус вывода с блокировкой
    SELECT ww.*, w.junior_id INTO v_withdrawal
    FROM work_withdrawals ww
    JOIN works w ON w.id = ww.work_id
    WHERE ww.id = p_withdrawal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Вывод не найден';
    END IF;

    v_old_status := v_withdrawal.status;
    v_work_junior_id := v_withdrawal.junior_id;

    -- Получаем роль проверяющего
    SELECT role INTO v_checker_role
    FROM users
    WHERE id = p_checker_id AND status = 'active';

    IF v_checker_role IS NULL THEN
        RAISE EXCEPTION 'Проверяющий не найден или неактивен';
    END IF;

    -- Получаем TeamLead Junior'а
    SELECT team_lead_id INTO v_junior_teamlead_id
    FROM users
    WHERE id = v_work_junior_id;

    -- Проверяем права на основе роли и статуса
    CASE 
        -- TeamLead может одобрять выводы только своих Junior
        WHEN v_checker_role = 'teamlead' THEN
            IF v_junior_teamlead_id != p_checker_id THEN
                RAISE EXCEPTION 'TeamLead может проверять только выводы своих Junior';
            END IF;
            
            -- TeamLead может только одобрять (received) или отклонять (problem)
            IF p_new_status NOT IN ('received', 'problem') THEN
                RAISE EXCEPTION 'TeamLead может только одобрить или отклонить вывод';
            END IF;

        -- Manager, HR, CFO, Admin могут блокировать любые выводы
        WHEN v_checker_role IN ('manager', 'hr', 'cfo', 'admin') THEN
            -- Эти роли могут делать любые действия с любыми выводами
            NULL;

        ELSE
            RAISE EXCEPTION 'Недостаточно прав для проверки выводов (роль: %)', v_checker_role;
    END CASE;

    -- Проверяем что вывод можно проверить
    IF v_old_status NOT IN ('new', 'waiting', 'problem') THEN
        RAISE EXCEPTION 'Вывод уже обработан (статус: %)', v_old_status;
    END IF;

    -- Обновляем статус
    UPDATE work_withdrawals
    SET 
        status = p_new_status,
        checked_by = p_checker_id,
        checked_at = NOW(),
        manager_notes = p_comment,
        alarm_message = CASE 
            WHEN p_new_status IN ('problem', 'block') THEN p_comment
            ELSE NULL
        END
    WHERE id = p_withdrawal_id;

    -- Логируем изменение
    INSERT INTO work_status_history (
        withdrawal_id,
        work_id,
        old_status,
        new_status,
        changed_by,
        change_reason
    ) VALUES (
        p_withdrawal_id,
        v_withdrawal.work_id,
        v_old_status::VARCHAR,
        p_new_status::VARCHAR,
        p_checker_id,
        COALESCE(p_comment, 'Проверка ' || v_checker_role)
    );

    -- Если вывод одобрен, завершаем работу
    IF p_new_status = 'received' THEN
        UPDATE works
        SET status = 'completed'
        WHERE id = v_withdrawal.work_id;
    END IF;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Ошибка проверки вывода: %', SQLERRM;
END;
$$;

-- Создаем представление для очереди выводов TeamLead
CREATE OR REPLACE VIEW teamlead_withdrawal_queue AS
SELECT 
    ww.id,
    ww.withdrawal_amount,
    ww.status,
    ww.created_at,
    ww.checked_at,
    ww.manager_notes,
    ww.alarm_message,
    w.id as work_id,
    w.deposit_amount,
    w.casino_login,
    w.notes as work_notes,
    c.name as casino_name,
    c.currency as casino_currency,
    c.url as casino_url,
    u.id as junior_id,
    u.first_name as junior_first_name,
    u.last_name as junior_last_name,
    u.email as junior_email,
    u.team_lead_id,
    card.card_number_mask,
    ba.holder_name as card_holder,
    bank.name as bank_name,
    -- Расчет времени ожидания
    EXTRACT(EPOCH FROM (NOW() - ww.created_at))/3600 as hours_waiting,
    -- Расчет профита
    (ww.withdrawal_amount - w.deposit_amount) as profit_amount
FROM work_withdrawals ww
JOIN works w ON w.id = ww.work_id
JOIN users u ON u.id = w.junior_id
LEFT JOIN casinos c ON c.id = w.casino_id
LEFT JOIN cards card ON card.id = w.card_id
LEFT JOIN bank_accounts ba ON ba.id = card.bank_account_id
LEFT JOIN banks bank ON bank.id = ba.bank_id
WHERE ww.status IN ('new', 'waiting', 'problem')
ORDER BY ww.created_at ASC;

-- Обновляем существующую функцию для обратной совместимости
CREATE OR REPLACE FUNCTION check_withdrawal_safe(
    p_withdrawal_id UUID,
    p_checker_id UUID,
    p_new_status withdrawal_status,
    p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Вызываем новую версию функции
    RETURN check_withdrawal_safe_v3(p_withdrawal_id, p_checker_id, p_new_status, p_comment);
END;
$$;

-- Комментарии к изменениям
COMMENT ON FUNCTION check_withdrawal_safe_v3 IS 'Обновленная функция проверки выводов: TeamLead проверяет своих Junior, Manager/HR/CFO могут блокировать любые';
COMMENT ON VIEW teamlead_withdrawal_queue IS 'Очередь выводов для TeamLead с детальной информацией и расчетом времени ожидания';
