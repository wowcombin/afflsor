-- Таблица для логирования доступа к CVV
CREATE TABLE IF NOT EXISTS cvv_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  card_id UUID NOT NULL REFERENCES cards(id),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_cvv_access_user ON cvv_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvv_access_card ON cvv_access_log(card_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvv_access_failed ON cvv_access_log(success, attempted_at DESC) WHERE success = FALSE;

-- Функция для очистки старых логов (старше 90 дней)
CREATE OR REPLACE FUNCTION cleanup_old_cvv_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM cvv_access_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Расписание очистки (запускается ежедневно в 02:00)
-- В production настроить через pg_cron:
-- SELECT cron.schedule('cleanup-cvv-logs', '0 2 * * *', 'SELECT cleanup_old_cvv_logs();');

COMMENT ON TABLE cvv_access_log IS 'Журнал доступа к CVV кодам карт для аудита безопасности';
COMMENT ON COLUMN cvv_access_log.success IS 'TRUE - успешный доступ, FALSE - неудачная попытка';
COMMENT ON COLUMN cvv_access_log.ip_address IS 'IP адрес пользователя для отслеживания подозрительной активности';
COMMENT ON COLUMN cvv_access_log.user_agent IS 'User Agent браузера для дополнительной идентификации';
