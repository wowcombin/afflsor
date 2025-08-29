-- Система NDA (соглашения о неразглашении)

-- Таблица шаблонов NDA
CREATE TABLE IF NOT EXISTS nda_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица токенов NDA для подписания
CREATE TABLE IF NOT EXISTS nda_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  template_id UUID NOT NULL REFERENCES nda_templates(id),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица подписанных NDA
CREATE TABLE IF NOT EXISTS nda_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL REFERENCES nda_tokens(id),
  user_id UUID NOT NULL REFERENCES users(id),
  template_id UUID NOT NULL REFERENCES nda_templates(id),
  full_name VARCHAR(200) NOT NULL,
  passport_data VARCHAR(50),
  address TEXT,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  signature_data JSONB, -- Для хранения данных электронной подписи
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица логов просмотра NDA
CREATE TABLE IF NOT EXISTS nda_view_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL REFERENCES nda_tokens(id),
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_nda_tokens_token ON nda_tokens(token);
CREATE INDEX IF NOT EXISTS idx_nda_tokens_user ON nda_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_nda_signatures_user ON nda_signatures(user_id, signed_at);
CREATE INDEX IF NOT EXISTS idx_nda_view_logs_token ON nda_view_logs(token_id, viewed_at);

-- Функция для генерации уникального токена
CREATE OR REPLACE FUNCTION generate_nda_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки истечения токенов
CREATE OR REPLACE FUNCTION cleanup_expired_nda_tokens()
RETURNS void AS $$
BEGIN
  -- Помечаем истекшие токены как использованные
  UPDATE nda_tokens 
  SET is_used = TRUE 
  WHERE expires_at < NOW() AND is_used = FALSE;
  
  -- Удаляем старые логи просмотра (старше 1 года)
  DELETE FROM nda_view_logs 
  WHERE viewed_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at в nda_templates
CREATE OR REPLACE FUNCTION update_nda_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trg_nda_templates_updated_at
  BEFORE UPDATE ON nda_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_nda_template_updated_at();

-- Представление для активных NDA
CREATE OR REPLACE VIEW active_nda_requests AS
SELECT 
  nt.id,
  nt.token,
  nt.expires_at,
  nt.created_at,
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  ntemp.name as template_name,
  ntemp.version as template_version,
  CASE 
    WHEN nt.expires_at < NOW() THEN 'expired'
    WHEN nt.is_used THEN 'signed'
    ELSE 'pending'
  END as status,
  -- Проверяем, был ли просмотрен
  EXISTS(SELECT 1 FROM nda_view_logs nvl WHERE nvl.token_id = nt.id) as was_viewed,
  -- Количество просмотров
  (SELECT COUNT(*) FROM nda_view_logs nvl WHERE nvl.token_id = nt.id) as view_count
FROM nda_tokens nt
JOIN users u ON u.id = nt.user_id
JOIN nda_templates ntemp ON ntemp.id = nt.template_id
WHERE nt.is_used = FALSE
ORDER BY nt.created_at DESC;

-- Вставляем базовый шаблон NDA
INSERT INTO nda_templates (name, content, version, created_by) 
SELECT 
  'Стандартный NDA',
  'ДОГОВІР ПРО НЕРОЗГОЛОШЕННЯ КОНФІДЕНЦІЙНОЇ ІНФОРМАЦІЇ

м. Київ [SIGNATURE_DATE]

Компанія «Xbsidian Co.», надалі – "Роботодавець", представлена директором Андрієм Головачем, який діє на підставі Статуту, зареєстрована за адресою: м. Київ, Просп. Європейського Союзу, 64.

Працівник [FULL_NAME], паспортні дані [PASSPORT], надалі іменований "Співробітник", який проживає за адресою: [ADDRESS].

Роботодавець і Працівник надалі разом – «Сторони», окремо – «Сторона».

Сторони керуються статтями 9, 21, 147-149 Кодексу законів про працю України, статтями 36-37 Господарського кодексу України, статтями 627-628, 906 Цивільного кодексу України, Законом України «Про комерційну таємницю» та Директивою (ЄС) 2016/943.

1. ПРЕДМЕТ ДОГОВОРУ
1.1. Сторони погодили, що будь-яка інформація (незалежно від форми, носія чи способу отримання), до якої Працівник має або матиме доступ, отримує, створює чи дізнається під час виконання трудових обов''язків, є конфіденційною та становить «Конфіденційну інформацію» Роботодавця.

1.2. У межах цього Договору ділові відносини виникли з приводу: виконання завдань з обробки даних і управління обліковими записами в онлайн-системах Роботодавця.

1.3. До Конфіденційної інформації належить, зокрема, але не виключно:
1.3.1. фінансова, бухгалтерська, клієнтська, постачальницька та будь-яка бізнес-аналітика;
1.3.2. вихідні коди, бази даних, ТЗ, технічна або проєктна документація;
1.3.3. маркетингові, стратегічні, інвестиційні плани, ноу-хау, комерційні секрети;
1.3.4. інші відомості, що мають комерційну цінність для Роботодавця.

2. РОЗГОЛОШЕННЯ КОНФІДЕНЦІЙНОЇ ІНФОРМАЦІЇ
2.1. Під Розголошенням розуміється будь-яка з наведених дій:
2.1.1. умисне, недбале або необережне повідомлення Конфіденційної інформації третім особам;
2.1.2. копіювання, публікація чи передача інформації будь-яким способом без письмового дозволу Роботодавця;
2.1.3. викрадення або втрата носіїв Конфіденційної інформації у будь-якій формі.

2.2. Інформація не вважається Конфіденційною, якщо Працівник доведе, що вона стала загальнодоступною без порушення цього Договору або була відома до початку трудових відносин.

3. СТРОК ДІЇ ДОГОВОРУ
3.1. Цей Договір є безстроковим щодо дії трудових відносин та зберігає силу 11 (одинадцять) років після їх припинення.

4. ПРАВА ТА ОБОВ''ЯЗКИ СТОРІН
4.1. Працівник зобов''язується захищати та не розголошувати Конфіденційну інформацію, використовувати її виключно в межах службових обов''язків.

4.2. Роботодавець зобов''язується повідомляти про зміни режиму конфіденційності та не розголошувати персональні дані Працівника.

5. ВІДПОВІДАЛЬНІСТЬ
5.1. За порушення умов договору встановлено штраф у розмірі 50 000 € (п''ятдесят тисяч євро).

6. ЗАКЛЮЧНІ ПОЛОЖЕННЯ
6.1. Договір набирає юридичної сили з моменту підписання.
6.2. Електронні підписи рівнозначні власноручним.

РЕКВІЗИТИ СТОРІН
Роботодавець: Андрій Головач
Адреса: м. Київ, вул. Сергія Данченка 24
Паспорт: FE655997

Підпис: _________________ Андрій Головач

Працівник: [FULL_NAME]
Адреса: [ADDRESS]  
Паспорт: [PASSPORT]

Підпис: _________________ [FULL_NAME]

Дата підписання: [SIGNATURE_DATE]',
  1,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM nda_templates WHERE name = 'Стандартный NDA');

COMMENT ON TABLE nda_templates IS 'Шаблоны NDA договоров с версионированием';
COMMENT ON TABLE nda_tokens IS 'Токены для подписания NDA с ограниченным сроком действия';
COMMENT ON TABLE nda_signatures IS 'Подписанные NDA с данными подписи и IP для аудита';
COMMENT ON TABLE nda_view_logs IS 'Логи просмотра NDA для отслеживания активности';
