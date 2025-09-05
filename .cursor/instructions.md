# CURSOR COMPOSER INSTRUCTIONS

## 🎯 ПЕРЕД НАЧАЛОМ ЛЮБОЙ ЗАДАЧИ

1. **Прочитай контекст проекта:**
   ```
   @vision/.1 @vision/.2 @vision/.3 @vision/.4 @vision/.5 @vision/.6 @vision/.7
   ```

2. **Изучи правила:**
   ```
   @.cursorrules
   @.cursor/rules/user-interaction.md
   @.cursor/rules/project-architecture.md
   ```

3. **Проверь схему БД:**
   ```
   @supabase/migrations/
   ```

## 🔐 RLS ПОЛИТИКИ - КРИТИЧНО

При работе с базой данных:
- ✅ Всегда включай роли: manager, admin, hr в политики
- ✅ Проверяй доступ для каждой роли
- ❌ Никогда не создавай политики только для части ролей

## 🔄 API РАЗРАБОТКА

Шаблон для API:
```typescript
// ВСЕГДА используй этот шаблон
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    console.log('API called:', { endpoint, user: user.email })
    
    // Бизнес-логика
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
```

## 🔍 ДИАГНОСТИКА

При проблемах создавай:
1. `/debug-auth` - диагностика аутентификации
2. `/test-api` - тестирование API endpoints
3. Простые API без JOIN для отладки

## ✅ ПРОВЕРКИ ПЕРЕД КОММИТОМ

```bash
npm run build  # ОБЯЗАТЕЛЬНО без ошибок
npm run lint   # Исправить все предупреждения
npm run typecheck  # Проверить типы
```

## 🚨 КРИТИЧЕСКИЕ ЗАПРЕТЫ

1. **RLS без manager роли** - основная причина проблем доступа
2. **API без аутентификации** - нарушение безопасности
3. **Статичные данные в продакшене** - только для диагностики
4. **Коммиты с ошибками** - ломает CI/CD

## 💬 КОММУНИКАЦИЯ

**Всегда объясняй:**
- Корень проблемы
- Пошаговое решение
- Что нужно сделать пользователю

**Не говори:**
- "Должно работать"
- "Попробуйте еще раз"
- Неточные диагнозы
