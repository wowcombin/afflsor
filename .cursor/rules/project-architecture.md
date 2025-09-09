# PROJECT ARCHITECTURE RULES

## 🏗️ СИСТЕМНАЯ АРХИТЕКТУРА

### РОЛИ ПОЛЬЗОВАТЕЛЕЙ (КРИТИЧНО):
```
junior   - создает работы, выводы
manager  - управляет Junior, одобряет выводы  
tester   - тестирует казино
hr       - управляет пользователями
cfo      - финансовый контроль
admin    - полный доступ
```

### ОСНОВНЫЕ ТАБЛИЦЫ:
```
users            - пользователи системы
works            - работы Junior
work_withdrawals - выводы по работам
casinos          - казино
cards            - банковские карты
banks            - банки
```

## 🔐 RLS ПОЛИТИКИ (ОБЯЗАТЕЛЬНО)

### ПРАВИЛО: ВСЕ ТАБЛИЦЫ ДОЛЖНЫ ИМЕТЬ RLS
```sql
-- ВСЕГДА включать все необходимые роли
CREATE POLICY "policy_name" ON table_name
FOR SELECT USING (
    auth.uid() IN (
        SELECT auth_id FROM users 
        WHERE role IN ('manager', 'admin', 'hr') 
        AND status = 'active'
    )
);
```

### ТИПИЧНЫЕ ПОЛИТИКИ:
- **users**: manager, hr, admin могут видеть всех
- **works**: Junior видит свои, Manager/Admin видят все
- **work_withdrawals**: Junior видит свои, Manager может одобрять
- **casinos, cards, banks**: все аутентифицированные могут читать

## 🔄 API АРХИТЕКТУРА

### СТРУКТУРА API:
```
/api/users/          - управление пользователями
/api/works/          - работы Junior
/api/work-withdrawals/ - выводы
/api/manager/        - специфичные для Manager
/api/currency-rates/ - курсы валют
```

### ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ API:
```typescript
// 1. Аутентификация
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 2. Детальное логирование
console.log('API called:', { endpoint, user: user.email, params })

// 3. Обработка ошибок
try {
  // логика
} catch (error) {
  console.error('API Error:', error)
  return NextResponse.json({ 
    error: 'Internal server error',
    details: error.message 
  }, { status: 500 })
}

// 4. Валидация входных данных (Zod)
const schema = z.object({ ... })
const validatedData = schema.parse(requestData)
```

## 🛡️ MIDDLEWARE И АУТЕНТИФИКАЦИЯ

### MIDDLEWARE ЛОГИКА:
1. Проверить аутентификацию Supabase
2. Получить роль из таблицы users
3. Проверить соответствие роли и маршрута
4. Перенаправить на правильную страницу

### ЗАЩИЩЕННЫЕ МАРШРУТЫ:
```
/dashboard/junior/*   - только junior
/dashboard/manager/*  - только manager
/dashboard/admin/*    - только admin
```

## 💰 БИЗНЕС-ЛОГИКА

### РАСЧЕТ ПРОФИТА:
```
Профит = Сумма вывода - Сумма депозита
Конвертация в USD = Google курс * 0.95 (Google rate -5%)
```

### СТАТУСЫ ВЫВОДОВ:
```
waiting  - ожидает одобрения Manager
received - одобрено Manager
block    - заблокировано Manager
```

### ВАЛЮТЫ:
```
USD, GBP, EUR, CAD
Все расчеты в USD с конвертацией
```

## 🔍 ДИАГНОСТИКА И ОТЛАДКА

### ОБЯЗАТЕЛЬНЫЕ ДИАГНОСТИЧЕСКИЕ ИНСТРУМЕНТЫ:

#### 1. Проверка аутентификации:
```typescript
// /debug-auth
- Supabase auth status
- User data from users table
- Role and permissions
```

#### 2. Тестирование API:
```typescript
// /test-api
- Проверка каждого endpoint
- Статус коды и ошибки
- Доступность таблиц
```

#### 3. Простой API для отладки:
```typescript
// /api/simple-test
- Минимальные запросы без JOIN
- Пошаговая проверка таблиц
- Детальные логи
```

## 📊 АНАЛИТИКА И МЕТРИКИ

### ОСНОВНЫЕ МЕТРИКИ:
- Количество Junior (всего/активных)
- Статистика выводов (ожидают/одобрено/отклонено)
- Профит по периодам (день/неделя/месяц)
- Топ исполнители
- Статистика по казино

### КОНВЕРТАЦИЯ ВАЛЮТ:
```typescript
const convertToUSD = (amount: number, currency: string): number => {
  const rates = {
    'USD': 1,
    'GBP': 1.27 * 0.95, // Google rate -5%
    'EUR': 1.09 * 0.95,
    'CAD': 0.74 * 0.95
  }
  return amount * (rates[currency] || 1)
}
```

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### НИКОГДА НЕ ДЕЛАТЬ:
1. **RLS политики без всех ролей** - всегда включать manager, admin
2. **API без аутентификации** - всегда проверять user
3. **Сложные JOIN без тестирования** - начинать с простых запросов
4. **Статичные данные в продакшене** - только для диагностики
5. **Изменения без миграций** - все изменения БД через migrations

### ВСЕГДА ДЕЛАТЬ:
1. **Проверять компиляцию** - `npm run build`
2. **Тестировать каждую роль** отдельно
3. **Добавлять детальные логи** в API
4. **Создавать диагностические инструменты** при проблемах
5. **Документировать изменения** в vision/

## 🔄 ПРОЦЕСС РАЗРАБОТКИ

### ЧЕК-ЛИСТ ПЕРЕД НАЧАЛОМ:
- [ ] Прочитать vision/ файлы
- [ ] Понять схему БД
- [ ] Изучить существующие RLS политики
- [ ] Определить все роли пользователей
- [ ] Проверить middleware логику

### ЧЕК-ЛИСТ ПЕРЕД КОММИТОМ:
- [ ] `npm run build` успешно
- [ ] Протестированы все затронутые роли
- [ ] Добавлены/обновлены RLS политики
- [ ] Обновлена документация
- [ ] Нет ошибок в консоли браузера

### СТРУКТУРА КОММИТОВ:
```
feat: Добавлена аналитика для Manager роли
fix: Исправлены RLS политики для Manager
debug: Добавлены диагностические инструменты
```
