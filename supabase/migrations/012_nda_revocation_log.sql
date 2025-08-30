-- Миграция 012: Добавление таблицы для отзыва NDA запросов
-- Эта миграция безопасно добавляет функциональность отзыва NDA без изменения существующих данных

-- Создаем таблицу для логирования отзыва NDA запросов
CREATE TABLE IF NOT EXISTS nda_revocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES nda_tokens(id),
  revoked_by UUID NOT NULL REFERENCES users(id),
  revocation_reason TEXT,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_nda_revocation_log_token_id ON nda_revocation_log(token_id);
CREATE INDEX IF NOT EXISTS idx_nda_revocation_log_revoked_by ON nda_revocation_log(revoked_by);
CREATE INDEX IF NOT EXISTS idx_nda_revocation_log_revoked_at ON nda_revocation_log(revoked_at);

-- Добавляем поле is_revoked в таблицу nda_tokens (если его еще нет)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nda_tokens' AND column_name = 'is_revoked'
    ) THEN
        ALTER TABLE nda_tokens ADD COLUMN is_revoked BOOLEAN DEFAULT FALSE;
        
        -- Добавляем индекс для поля is_revoked
        CREATE INDEX idx_nda_tokens_is_revoked ON nda_tokens(is_revoked);
    END IF;
END $$;

-- Обновляем представление active_nda_requests чтобы исключать отозванные запросы
DROP VIEW IF EXISTS active_nda_requests;
CREATE VIEW active_nda_requests AS
SELECT 
    nt.id,
    nt.token,
    nt.expires_at,
    nt.created_at,
    jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'role', u.role,
        'status', u.status
    ) as user,
    jsonb_build_object(
        'id', ndt.id,
        'name', ndt.name,
        'content', ndt.content,
        'version', ndt.version
    ) as template
FROM nda_tokens nt
JOIN users u ON nt.user_id = u.id
JOIN nda_templates ndt ON nt.template_id = ndt.id
LEFT JOIN nda_signatures ns ON nt.id = ns.token_id
WHERE ns.id IS NULL  -- Еще не подписано
  AND nt.expires_at > NOW()  -- Не истекло
  AND nt.is_revoked = FALSE  -- Не отозвано
ORDER BY nt.created_at DESC;

-- Добавляем комментарии к таблице
COMMENT ON TABLE nda_revocation_log IS 'Логирование отзыва NDA запросов';
COMMENT ON COLUMN nda_revocation_log.token_id IS 'ID отозванного токена';
COMMENT ON COLUMN nda_revocation_log.revoked_by IS 'ID пользователя, который отозвал запрос';
COMMENT ON COLUMN nda_revocation_log.revocation_reason IS 'Причина отзыва запроса';
COMMENT ON COLUMN nda_revocation_log.revoked_at IS 'Время отзыва';
