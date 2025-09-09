-- Миграция 007: Система логирования действий
-- Создаем таблицу для отслеживания всех действий в системе

-- Создаем enum для типов действий
CREATE TYPE action_type AS ENUM (
  'bank_created',
  'bank_blocked',
  'bank_deleted',
  'account_created', 
  'account_updated',
  'account_blocked',
  'account_deleted',
  'card_created',
  'card_updated', 
  'card_deleted',
  'card_blocked',
  'balance_updated'
);

-- Создаем таблицу для логирования действий
CREATE TABLE action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type action_type NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'bank', 'account', 'card'
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255), -- Имя сущности для удобства
  old_values JSONB, -- Старые значения (для обновлений)
  new_values JSONB, -- Новые значения
  change_description TEXT NOT NULL, -- Описание изменения
  performed_by UUID NOT NULL REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для производительности
CREATE INDEX idx_action_history_action_type ON action_history(action_type);
CREATE INDEX idx_action_history_entity_type ON action_history(entity_type);
CREATE INDEX idx_action_history_entity_id ON action_history(entity_id);
CREATE INDEX idx_action_history_performed_by ON action_history(performed_by);
CREATE INDEX idx_action_history_created_at ON action_history(created_at DESC);

-- Создаем представление для удобного просмотра истории
CREATE VIEW action_history_view AS
SELECT 
  ah.id,
  ah.action_type,
  ah.entity_type,
  ah.entity_id,
  ah.entity_name,
  ah.old_values,
  ah.new_values,
  ah.change_description,
  ah.ip_address,
  ah.user_agent,
  ah.created_at,
  u.first_name,
  u.last_name,
  u.email,
  u.role,
  -- Дополнительная информация в зависимости от типа сущности
  CASE 
    WHEN ah.entity_type = 'bank' THEN 
      (SELECT jsonb_build_object('name', b.name, 'country', b.country, 'currency', b.currency) 
       FROM banks b WHERE b.id = ah.entity_id)
    WHEN ah.entity_type = 'account' THEN 
      (SELECT jsonb_build_object('holder_name', ba.holder_name, 'account_number', ba.account_number, 'bank_name', banks.name) 
       FROM bank_accounts ba JOIN banks ON ba.bank_id = banks.id WHERE ba.id = ah.entity_id)
    WHEN ah.entity_type = 'card' THEN 
      (SELECT jsonb_build_object('card_mask', c.card_number_mask, 'card_type', c.card_type, 'account_name', ba.holder_name, 'bank_name', banks.name) 
       FROM cards c JOIN bank_accounts ba ON c.bank_account_id = ba.id JOIN banks ON ba.bank_id = banks.id WHERE c.id = ah.entity_id)
    ELSE NULL
  END as entity_details
FROM action_history ah
JOIN users u ON ah.performed_by = u.id
ORDER BY ah.created_at DESC;

-- Создаем функцию для логирования действий
CREATE OR REPLACE FUNCTION log_action(
  p_action_type action_type,
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_entity_name VARCHAR(255),
  p_change_description TEXT,
  p_performed_by UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_log_id UUID;
BEGIN
  INSERT INTO action_history (
    action_type,
    entity_type,
    entity_id,
    entity_name,
    old_values,
    new_values,
    change_description,
    performed_by,
    ip_address,
    user_agent
  ) VALUES (
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_old_values,
    p_new_values,
    p_change_description,
    p_performed_by,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем RLS политики
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;

-- Политика: CFO и Admin могут видеть всю историю, остальные только свои действия
CREATE POLICY "action_history_select_policy" ON action_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (
        SELECT id FROM users 
        WHERE auth_id = auth.uid()
      ) 
      AND (
        users.role IN ('cfo', 'admin') OR 
        users.id = action_history.performed_by
      )
    )
  );

-- Политика: Только система может вставлять записи
CREATE POLICY "action_history_insert_policy" ON action_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = performed_by 
      AND users.auth_id = auth.uid()
    )
  );

COMMENT ON TABLE action_history IS 'Логирование всех действий в системе';
COMMENT ON FUNCTION log_action IS 'Функция для удобного логирования действий';
