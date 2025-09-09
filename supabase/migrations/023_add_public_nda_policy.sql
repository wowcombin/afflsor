-- Миграция 021: Добавление публичной политики для NDA подписания

-- Добавляем политику для публичного доступа к NDA соглашениям по токену
CREATE POLICY "Публичный доступ к NDA по токену" ON nda_agreements
    FOR SELECT USING (
        -- Разрешаем доступ если есть access_token и он не пустой
        access_token IS NOT NULL AND access_token != ''
    );

-- Добавляем политику для обновления NDA при подписании
CREATE POLICY "Публичное обновление NDA при подписании" ON nda_agreements
    FOR UPDATE USING (
        -- Разрешаем обновление если есть access_token и статус pending
        access_token IS NOT NULL AND access_token != '' AND status = 'pending'
    );

-- Добавляем политику для публичного доступа к шаблонам NDA
CREATE POLICY "Публичный доступ к активным шаблонам NDA" ON nda_templates
    FOR SELECT USING (
        -- Разрешаем доступ к активным шаблонам
        is_active = true
    );

-- Добавляем политику для создания файлов NDA при подписании
CREATE POLICY "Публичное создание файлов NDA при подписании" ON nda_files
    FOR INSERT WITH CHECK (
        -- Разрешаем создание файлов для соглашений с токеном
        agreement_id IN (
            SELECT id FROM nda_agreements 
            WHERE access_token IS NOT NULL AND access_token != ''
        )
    );

-- Добавляем политику для публичной загрузки файлов в Storage
CREATE POLICY "Публичная загрузка NDA файлов" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'nda-files'
);

COMMENT ON POLICY "Публичный доступ к NDA по токену" ON nda_agreements IS 'Позволяет внешним пользователям получать доступ к NDA соглашениям по токену доступа';
COMMENT ON POLICY "Публичное обновление NDA при подписании" ON nda_agreements IS 'Позволяет внешним пользователям обновлять NDA соглашения при подписании';
COMMENT ON POLICY "Публичный доступ к активным шаблонам NDA" ON nda_templates IS 'Позволяет внешним пользователям читать активные шаблоны NDA';
COMMENT ON POLICY "Публичное создание файлов NDA при подписании" ON nda_files IS 'Позволяет внешним пользователям загружать файлы при подписании NDA';
