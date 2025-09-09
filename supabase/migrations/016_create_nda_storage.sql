-- Создаем bucket для файлов NDA
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nda-files',
  'nda-files',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
);

-- Создаем политики для bucket nda-files
CREATE POLICY "HR, Manager и Admin могут просматривать NDA файлы" ON storage.objects
FOR SELECT USING (
  bucket_id = 'nda-files' AND
  auth.uid() IN (
    SELECT auth_id FROM users 
    WHERE role IN ('hr', 'manager', 'admin') 
    AND status = 'active'
  )
);

CREATE POLICY "Система может загружать NDA файлы" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'nda-files'
);

CREATE POLICY "HR, Manager и Admin могут удалять NDA файлы" ON storage.objects
FOR DELETE USING (
  bucket_id = 'nda-files' AND
  auth.uid() IN (
    SELECT auth_id FROM users 
    WHERE role IN ('hr', 'manager', 'admin') 
    AND status = 'active'
  )
);
