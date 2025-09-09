-- Исправляем поля в таблице nda_agreements, которые должны быть nullable
-- Эти поля заполняются только после подписания NDA

ALTER TABLE nda_agreements 
  ALTER COLUMN document_number DROP NOT NULL,
  ALTER COLUMN birth_date DROP NOT NULL,
  ALTER COLUMN document_issued_by DROP NOT NULL,
  ALTER COLUMN document_issued_date DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL;

-- Добавляем поля для токена доступа и дополнительной информации
ALTER TABLE nda_agreements 
  ADD COLUMN IF NOT EXISTS access_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS issuance_address TEXT,
  ADD COLUMN IF NOT EXISTS issuance_date DATE,
  ADD COLUMN IF NOT EXISTS residential_address TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Создаем индекс для токена доступа
CREATE INDEX IF NOT EXISTS idx_nda_agreements_access_token ON nda_agreements(access_token);

-- Обновляем структуру таблицы nda_files для соответствия коду
ALTER TABLE nda_files 
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS file_url,
  ADD COLUMN IF NOT EXISTS file_path TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);

-- Переименовываем колонку для соответствия коду
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nda_files' AND column_name = 'file_name') THEN
    ALTER TABLE nda_files RENAME COLUMN file_name TO original_filename;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nda_files' AND column_name = 'file_url') THEN
    ALTER TABLE nda_files RENAME COLUMN file_url TO file_path;
  END IF;
END $$;

-- Обновляем существующие записи (если есть) - устанавливаем NULL для пустых значений
UPDATE nda_agreements 
SET 
  document_number = NULL,
  birth_date = NULL,
  document_issued_by = NULL,
  document_issued_date = NULL,
  address = NULL
WHERE 
  status = 'pending' AND (
    document_number = '' OR 
    birth_date IS NULL OR 
    document_issued_by = '' OR 
    document_issued_date IS NULL OR 
    address = ''
  );
