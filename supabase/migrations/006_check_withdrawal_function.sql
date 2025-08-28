-- Функция безопасной проверки вывода с блокировкой
CREATE OR REPLACE FUNCTION check_withdrawal_safe(
    p_withdrawal_id UUID,
    p_checker_id UUID,
    p_new_status withdrawal_status,
    p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lock_id BIGINT;
    v_current_status withdrawal_status;
    v_work_id UUID;
BEGIN
    -- Генерируем уникальный ID для advisory lock
    v_lock_id := ('x' || substr(md5(p_withdrawal_id::text), 1, 15))::bit(60)::bigint;
    
    -- Получаем эксклюзивную блокировку
    IF NOT pg_try_advisory_xact_lock(v_lock_id) THEN
        RETURN FALSE; -- Кто-то уже проверяет этот вывод
    END IF;
    
    -- Проверяем текущий статус
    SELECT status, work_id INTO v_current_status, v_work_id
    FROM work_withdrawals
    WHERE id = p_withdrawal_id;
    
    -- Можно проверять только new или waiting
    IF v_current_status NOT IN ('new', 'waiting') THEN
        RETURN FALSE;
    END IF;
    
    -- Обновляем статус
    UPDATE work_withdrawals
    SET status = p_new_status,
        checked_by = p_checker_id,
        checked_at = NOW(),
        alarm_message = p_comment
    WHERE id = p_withdrawal_id;
    
    -- Если статус received, обновляем статус work
    IF p_new_status = 'received' THEN
        UPDATE works
        SET status = 'completed'
        WHERE id = v_work_id;
    END IF;
    
    RETURN TRUE;
END;
$$;
