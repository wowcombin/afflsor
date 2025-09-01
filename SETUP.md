# Afflsor ERP System - Настройка проекта

## Требования
- Node.js 18+
- PostgreSQL 14+
- Supabase проект

## Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
Создайте файл `.env.local` в корне проекта:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
POSTGRES_URL=postgres://postgres:password@localhost:5432/afflsor_erp
POSTGRES_USER=postgres
POSTGRES_HOST=localhost
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=afflsor_erp

# JWT Secret
SUPABASE_JWT_SECRET=your_jwt_secret

# Application Settings
NODE_ENV=development
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min
```

### 3. Настройка базы данных
```bash
# Запустите миграции Supabase
npx supabase db reset
npx supabase db push

# Или примените миграции вручную в следующем порядке:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_cards_and_banks.sql
# 3. ... (все остальные по порядку)
```

### 4. Создание первого пользователя
```sql
-- Выполните в Supabase SQL Editor или psql
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Затем создайте запись в таблице users
INSERT INTO users (auth_id, email, role, status, first_name, last_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  'admin@example.com',
  'admin',
  'active',
  'System',
  'Administrator'
);
```

### 5. Запуск проекта
```bash
npm run dev
```

Проект будет доступен по адресу: http://localhost:3000

## Структура ролей

### Доступные роли:
- **junior** - Младший сотрудник (создание депозитов, выводы)
- **tester** - Тестировщик казино
- **manager** - Менеджер (проверка выводов, управление командой)
- **hr** - HR специалист (управление персоналом)
- **cfo** - Финансовый директор (финансы, банки)
- **admin** - Администратор (полный доступ)

### Маршруты по ролям:
- Junior: `/dashboard/junior`
- Manager: `/dashboard/manager`
- Tester: `/dashboard/tester`
- HR: `/dashboard/hr`
- CFO: `/dashboard/cfo`
- Admin: `/dashboard/admin`

## Разработка

### Команды
```bash
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка для продакшена
npm run start        # Запуск продакшен сборки
npm run lint         # Линтинг кода
npm run type-check   # Проверка типов TypeScript
```

### Архитектура
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Supabase
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Supabase client

### Безопасность
- Row Level Security (RLS) включен для всех таблиц
- Middleware защищает маршруты по ролям
- Аудит всех действий пользователей
- Шифрование чувствительных данных

## Troubleshooting

### Проблема: "User not found in system"
- Убедитесь, что пользователь существует в таблице `users`
- Проверьте соответствие `auth_id` в таблицах `auth.users` и `users`

### Проблема: "Access denied"
- Проверьте RLS политики в Supabase
- Убедитесь, что роль пользователя соответствует доступу

### Проблема: "Environment variables not found"
- Проверьте наличие файла `.env.local`
- Убедитесь, что все переменные указаны корректно
