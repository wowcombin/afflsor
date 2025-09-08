-- Миграция 015: Система NDA (соглашения о неразглашении)

-- Создаем типы для NDA
CREATE TYPE nda_status AS ENUM ('pending', 'signed', 'expired', 'cancelled');
CREATE TYPE document_type AS ENUM ('passport', 'id_card', 'driver_license');

-- Таблица NDA шаблонов
CREATE TABLE nda_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- HTML контент с плейсхолдерами
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица NDA соглашений
CREATE TABLE nda_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  template_id UUID REFERENCES nda_templates(id),
  
  -- Персональные данные
  full_name VARCHAR(255) NOT NULL,
  birth_date DATE,
  email VARCHAR(255) NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  document_type document_type DEFAULT 'passport',
  document_issued_by VARCHAR(255),
  document_issued_date DATE,
  address TEXT,
  
  -- Статус и даты
  status nda_status DEFAULT 'pending',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Подпись и документы
  signature_data TEXT, -- Base64 подписи
  signed_document_url TEXT, -- Ссылка на подписанный PDF
  
  -- Файлы документов
  passport_photo_url TEXT, -- Фото паспорта
  selfie_with_passport_url TEXT, -- Селфи с паспортом
  
  -- Метаданные
  ip_address INET,
  user_agent TEXT,
  signing_location TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для хранения файлов NDA
CREATE TABLE nda_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES nda_agreements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL, -- 'signed_pdf', 'passport_photo', 'selfie'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_nda_agreements_user_id ON nda_agreements(user_id);
CREATE INDEX idx_nda_agreements_status ON nda_agreements(status);
CREATE INDEX idx_nda_agreements_signed_at ON nda_agreements(signed_at);
CREATE INDEX idx_nda_files_agreement_id ON nda_files(agreement_id);

-- Триггеры для updated_at
CREATE TRIGGER update_nda_templates_updated_at 
    BEFORE UPDATE ON nda_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nda_agreements_updated_at 
    BEFORE UPDATE ON nda_agreements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Добавляем поля в таблицу users для связи с NDA
ALTER TABLE users ADD COLUMN nda_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN nda_signed_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN nda_agreement_id UUID REFERENCES nda_agreements(id);

-- Вставляем базовый шаблон NDA
INSERT INTO nda_templates (name, content, version, is_active) VALUES (
'Стандартный NDA Xbsidian Co.',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NDA Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ДОГОВІР ПРО НЕРОЗГОЛОШЕННЯ КОНФІДЕНЦІЙНОЇ ІНФОРМАЦІЇ</h1>
        <p>м. Київ [SIGNATURE_DATE]</p>
    </div>
    
    <div class="section">
        <p>Компанія «Xbsidian Co.», надалі – "Роботодавець", представлена директором Андрієм Головачем, який діє на підставі Статуту, зареєстрована за адресою: м. Київ, Просп. Європейського Союзу, 64.</p>
        
        <p>Працівник <strong>[FULL_NAME]</strong>, паспортні дані <strong>[PASSPORT]</strong>, надалі іменований "Співробітник", який проживає за адресою: <strong>[ADDRESS]</strong>.</p>
    </div>
    
    <!-- Весь остальной текст NDA -->
    <div class="section">
        <h2>1. ПРЕДМЕТ ДОГОВОРУ</h2>
        <p>1.1. Сторони погодили, що будь-яка інформація (незалежно від форми, носія чи способу отримання), до якої Працівник має або матиме доступ, отримує, створює чи дізнається під час виконання трудових обов'язків, є конфіденційною та становить «Конфіденційну інформацію» Роботодавця.</p>
        <!-- ... остальной контент ... -->
    </div>
    
    <div class="signature-block">
        <div>
            <p>Сторона – Роботодавець</p>
            <div class="signature">Андрій Головач</div>
        </div>
        <div>
            <p>Сторона – Працівник</p>
            <div class="signature">[FULL_NAME]</div>
        </div>
    </div>
</body>
</html>',
'1.0',
true
);

-- RLS политики
ALTER TABLE nda_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nda_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE nda_files ENABLE ROW LEVEL SECURITY;

-- Политики для nda_templates
CREATE POLICY "HR и Admin могут управлять шаблонами NDA" ON nda_templates
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin') AND status = 'active'
        )
    );

-- Политики для nda_agreements
CREATE POLICY "HR и Admin могут видеть все NDA" ON nda_agreements
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'ceo') AND status = 'active'
        )
    );

CREATE POLICY "Пользователи могут видеть свои NDA" ON nda_agreements
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "HR может создавать и обновлять NDA" ON nda_agreements
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin') AND status = 'active'
        )
    );

-- Политики для nda_files
CREATE POLICY "HR и Admin могут управлять файлами NDA" ON nda_files
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE role IN ('hr', 'admin', 'ceo') AND status = 'active'
        )
    );

COMMENT ON TABLE nda_agreements IS 'Соглашения о неразглашении (NDA)';
COMMENT ON TABLE nda_templates IS 'Шаблоны NDA документов';
COMMENT ON TABLE nda_files IS 'Файлы, связанные с NDA соглашениями';
