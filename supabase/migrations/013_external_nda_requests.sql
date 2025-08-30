-- Миграция 013: Внешние NDA запросы для незарегистрированных пользователей

-- Убеждаемся, что поле is_revoked существует в nda_tokens (из миграции 012)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nda_tokens' AND column_name = 'is_revoked'
    ) THEN
        ALTER TABLE nda_tokens ADD COLUMN is_revoked BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_nda_tokens_is_revoked ON nda_tokens(is_revoked);
    END IF;
END $$;

-- Таблица для NDA запросов внешним пользователям (не зарегистрированным в системе)
CREATE TABLE IF NOT EXISTS external_nda_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(200),
  template_id UUID NOT NULL REFERENCES nda_templates(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_signed BOOLEAN DEFAULT FALSE,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_external_nda_requests_token ON external_nda_requests(token);
CREATE INDEX IF NOT EXISTS idx_external_nda_requests_email ON external_nda_requests(email);
CREATE INDEX IF NOT EXISTS idx_external_nda_requests_created_by ON external_nda_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_external_nda_requests_expires_at ON external_nda_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_external_nda_requests_is_signed ON external_nda_requests(is_signed);
CREATE INDEX IF NOT EXISTS idx_external_nda_requests_is_revoked ON external_nda_requests(is_revoked);

-- Таблица для подписанных внешних NDA
CREATE TABLE IF NOT EXISTS external_nda_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_request_id UUID NOT NULL REFERENCES external_nda_requests(id),
  template_id UUID NOT NULL REFERENCES nda_templates(id),
  full_name VARCHAR(200) NOT NULL,
  passport_data VARCHAR(50),
  address TEXT,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  signature_data JSONB,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для внешних подписей
CREATE INDEX IF NOT EXISTS idx_external_nda_signatures_request_id ON external_nda_signatures(external_request_id);
CREATE INDEX IF NOT EXISTS idx_external_nda_signatures_email ON external_nda_signatures(email);
CREATE INDEX IF NOT EXISTS idx_external_nda_signatures_signed_at ON external_nda_signatures(signed_at);

-- Таблица для логов просмотра внешних NDA
CREATE TABLE IF NOT EXISTS external_nda_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_request_id UUID NOT NULL REFERENCES external_nda_requests(id),
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для логов просмотра внешних NDA
CREATE INDEX IF NOT EXISTS idx_external_nda_view_logs_request_id ON external_nda_view_logs(external_request_id);

-- Функция для обновления updated_at в external_nda_requests
CREATE OR REPLACE FUNCTION update_external_nda_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trg_external_nda_requests_updated_at ON external_nda_requests;
CREATE TRIGGER trg_external_nda_requests_updated_at
    BEFORE UPDATE ON external_nda_requests
    FOR EACH ROW EXECUTE PROCEDURE update_external_nda_requests_updated_at();

-- Обновляем представление active_nda_requests чтобы включить внешние запросы
DROP VIEW IF EXISTS active_nda_requests;
CREATE VIEW active_nda_requests AS
-- Внутренние NDA запросы (зарегистрированные пользователи)
SELECT 
    nt.id,
    nt.token,
    nt.expires_at,
    nt.created_at,
    'internal' as request_type,
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
    ) as template,
    CASE 
        WHEN ns.id IS NOT NULL THEN 'signed'
        WHEN nt.expires_at <= NOW() THEN 'expired'
        ELSE 'pending'
    END as status,
    CASE WHEN nvl.id IS NOT NULL THEN true ELSE false END as was_viewed,
    COALESCE(view_counts.view_count, 0) as view_count
FROM nda_tokens nt
JOIN users u ON nt.user_id = u.id
JOIN nda_templates ndt ON nt.template_id = ndt.id
LEFT JOIN nda_signatures ns ON nt.id = ns.token_id
LEFT JOIN nda_view_logs nvl ON nt.id = nvl.token_id
LEFT JOIN (
    SELECT token_id, COUNT(*) as view_count
    FROM nda_view_logs
    GROUP BY token_id
) view_counts ON nt.id = view_counts.token_id
WHERE nt.is_revoked = FALSE

UNION ALL

-- Внешние NDA запросы (незарегистрированные пользователи)
SELECT 
    enr.id,
    enr.token,
    enr.expires_at,
    enr.created_at,
    'external' as request_type,
    jsonb_build_object(
        'id', null,
        'email', enr.email,
        'first_name', COALESCE(SPLIT_PART(enr.full_name, ' ', 1), ''),
        'last_name', COALESCE(SPLIT_PART(enr.full_name, ' ', 2), ''),
        'role', 'external',
        'status', 'external'
    ) as user,
    jsonb_build_object(
        'id', ndt.id,
        'name', ndt.name,
        'content', ndt.content,
        'version', ndt.version
    ) as template,
    CASE 
        WHEN enr.is_signed = true THEN 'signed'
        WHEN enr.expires_at <= NOW() THEN 'expired'
        ELSE 'pending'
    END as status,
    CASE WHEN envl.id IS NOT NULL THEN true ELSE false END as was_viewed,
    COALESCE(ext_view_counts.view_count, 0) as view_count
FROM external_nda_requests enr
JOIN nda_templates ndt ON enr.template_id = ndt.id
LEFT JOIN external_nda_view_logs envl ON enr.id = envl.external_request_id
LEFT JOIN (
    SELECT external_request_id, COUNT(*) as view_count
    FROM external_nda_view_logs
    GROUP BY external_request_id
) ext_view_counts ON enr.id = ext_view_counts.external_request_id
WHERE enr.is_revoked = FALSE

ORDER BY created_at DESC;

-- Комментарии к таблицам
COMMENT ON TABLE external_nda_requests IS 'NDA запросы для внешних пользователей (не зарегистрированных в системе)';
COMMENT ON TABLE external_nda_signatures IS 'Подписанные внешние NDA';
COMMENT ON TABLE external_nda_view_logs IS 'Логи просмотра внешних NDA';

COMMENT ON COLUMN external_nda_requests.email IS 'Email внешнего пользователя';
COMMENT ON COLUMN external_nda_requests.full_name IS 'Полное имя внешнего пользователя';
COMMENT ON COLUMN external_nda_requests.is_signed IS 'Подписан ли NDA';
COMMENT ON COLUMN external_nda_requests.is_revoked IS 'Отозван ли запрос';
