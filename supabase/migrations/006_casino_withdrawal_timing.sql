-- Добавление полей времени вывода для казино
ALTER TABLE casinos ADD COLUMN IF NOT EXISTS withdrawal_time_value INTEGER DEFAULT 0;
ALTER TABLE casinos ADD COLUMN IF NOT EXISTS withdrawal_time_unit VARCHAR(20) DEFAULT 'instant';

-- withdrawal_time_unit может быть: 'instant', 'minutes', 'hours'
-- withdrawal_time_value: числовое значение (0 для instant, количество для minutes/hours)

COMMENT ON COLUMN casinos.withdrawal_time_value IS 'Время вывода: 0 для моментального, число для минут/часов';
COMMENT ON COLUMN casinos.withdrawal_time_unit IS 'Единица времени: instant, minutes, hours';

-- Обновляем существующие казино на моментальный вывод
UPDATE casinos 
SET withdrawal_time_value = 0, withdrawal_time_unit = 'instant' 
WHERE withdrawal_time_value IS NULL OR withdrawal_time_unit IS NULL;

-- Индекс для быстрого поиска по времени вывода
CREATE INDEX IF NOT EXISTS idx_casinos_withdrawal_time ON casinos(withdrawal_time_unit, withdrawal_time_value) 
WHERE status = 'active';

-- Функция для получения времени вывода в читаемом формате
CREATE OR REPLACE FUNCTION get_withdrawal_time_label(time_value INTEGER, time_unit VARCHAR)
RETURNS TEXT AS $$
BEGIN
  CASE time_unit
    WHEN 'instant' THEN RETURN 'Моментально';
    WHEN 'minutes' THEN 
      IF time_value = 1 THEN RETURN '1 минута';
      ELSIF time_value < 5 THEN RETURN time_value || ' минуты';
      ELSE RETURN time_value || ' минут';
      END IF;
    WHEN 'hours' THEN 
      IF time_value = 1 THEN RETURN '1 час';
      ELSIF time_value < 5 THEN RETURN time_value || ' часа';
      ELSE RETURN time_value || ' часов';
      END IF;
    ELSE RETURN 'Не указано';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Таблица для истории изменений БИНов
CREATE TABLE IF NOT EXISTS casino_bin_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  casino_id UUID NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  old_bins TEXT[] DEFAULT '{}',
  new_bins TEXT[] DEFAULT '{}',
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска истории по казино
CREATE INDEX IF NOT EXISTS idx_casino_bin_history_casino ON casino_bin_history(casino_id, changed_at DESC);

-- Индекс для поиска по пользователю
CREATE INDEX IF NOT EXISTS idx_casino_bin_history_user ON casino_bin_history(changed_by, changed_at DESC);
