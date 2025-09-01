# Afflsor ERP System v2.0

🚀 **Современная ERP система для управления бизнес-процессами**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://afflsor.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)

## 🌟 Особенности

- **🔐 Безопасная аутентификация** с ролевым доступом
- **📊 Ролевые дашборды** для каждого типа пользователей
- **💳 Управление банковскими картами** и аккаунтами
- **💰 Финансовый контроль** и расчет зарплат
- **🎯 Система выводов** с проверкой и одобрением
- **🧪 Тестирование казино** и управление мануалами
- **👥 HR функции** и управление персоналом
- **📈 Аналитика и отчетность**

## 🎭 Роли пользователей

### 👨‍💼 Junior
- Создание депозитов и выводов
- Просмотр личной статистики
- Управление назначенными картами

### 👨‍💻 Manager
- Проверка и одобрение выводов
- Управление командой Junior'ов
- Контроль банковских балансов
- Назначение карт

### 🧪 Tester
- Тестирование новых казино
- Создание и обновление мануалов
- Проведение тестовых операций

### 👥 HR
- Управление сотрудниками
- Настройка зарплат и бонусов
- HR комментарии и отчеты

### 💰 CFO
- Финансовое планирование
- Расчет зарплат
- USDT переводы
- Управление расходами

### ⚡ Admin
- Полный доступ к системе
- Системные настройки
- Аудит и мониторинг

## 🛠 Технологический стек

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase Edge Functions
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth с RLS
- **Deployment**: Vercel
- **Styling**: Tailwind CSS с кастомными компонентами

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- Supabase проект
- Git

### Установка

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/wowcombin/afflsor.git
cd afflsor
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте переменные окружения**
```bash
cp .env.example .env.local
# Заполните переменные в .env.local
```

4. **Настройте базу данных**
```bash
# Примените миграции Supabase в порядке:
# 001_initial_schema.sql → 012_test_withdrawals.sql
```

5. **Запустите проект**
```bash
npm run dev
```

Проект будет доступен по адресу: http://localhost:3000

## 📚 Документация

Подробная документация доступна в файле [SETUP.md](./SETUP.md)

### Структура проекта
```
afflsor/
├── app/                    # Next.js App Router
│   ├── api/               # API маршруты
│   ├── auth/              # Страницы аутентификации
│   └── dashboard/         # Ролевые дашборды
├── components/ui/         # UI компоненты
├── lib/supabase/         # Supabase клиенты
├── supabase/             # Миграции и схемы БД
├── types/                # TypeScript типы
└── vision/               # Техническая документация
```

## 🔒 Безопасность

- **Row Level Security (RLS)** для всех таблиц
- **Ролевая авторизация** на уровне middleware
- **Аудит всех действий** пользователей
- **Шифрование чувствительных данных**
- **PCI DSS compliance** для работы с картами

## 🌐 Развертывание

Проект автоматически развертывается на [Vercel](https://afflsor.vercel.app/) при каждом push в main ветку.

### Переменные окружения для продакшена:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

## 🤝 Участие в разработке

1. Fork репозитория
2. Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект является частной разработкой. Все права защищены.

## 📞 Поддержка

Для вопросов и поддержки обращайтесь к команде разработки.

---

**Afflsor ERP System v2.0** - Современное решение для управления бизнес-процессами
