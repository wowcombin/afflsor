# 👥 ИНСТРУКЦИЯ ПО ДОБАВЛЕНИЮ ПОЛЬЗОВАТЕЛЕЙ

## 📋 СПИСОК ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ДОБАВЛЕНИЯ:

| Email | UID | Роль | Имя |
|-------|-----|------|-----|
| dimkoxobbit87@gmail.com | 78d65daf-7d0f-486c-ae0f-8b0639fb2db2 | Junior | Дмитрий |
| pocformail@gmail.com | aa58b8ef-a514-4242-863a-57c3ec578a26 | Manager | Александр |
| rezunenko1707@gmail.com | 854c82c7-ad11-4cd2-bed7-bac7c340e52f | Tester | Роман |
| yupiter871@gmail.com | 8f947e16-d0a8-4272-878e-c484d347365c | CFO | Юрий |
| zavgorodni22@gmail.com | f9928513-e6d1-45f1-a911-fae70ecf56a7 | HR | Анна |

## 🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ:

### ШАГ 1: СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ В SUPABASE AUTH
1. Откройте **Supabase Dashboard** → **Authentication** → **Users**
2. Для каждого пользователя нажмите **"Add user"**
3. Заполните:
   - **Email**: указанный email
   - **Password**: создайте временный пароль
   - **Email Confirmed**: ✅ **ОБЯЗАТЕЛЬНО ПОСТАВИТЬ ГАЛОЧКУ**
4. После создания скопируйте **User UID** (должен совпадать с указанным)

### ШАГ 2: ДОБАВЛЕНИЕ В ТАБЛИЦУ USERS
1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Выберите один из файлов:
   - `sql_insert_users.sql` - полная версия с именами и зарплатами
   - `sql_insert_users_simple.sql` - упрощенная версия
3. Скопируйте и выполните SQL код
4. Проверьте результат запросом в конце файла

### ШАГ 3: ПРОВЕРКА ДОСТУПА
Каждый пользователь сможет войти по своему email и паролю:
- **Junior**: `dimkoxobbit87@gmail.com` → `/junior/dashboard`
- **Manager**: `pocformail@gmail.com` → `/manager/dashboard`  
- **Tester**: `rezunenko1707@gmail.com` → `/tester/dashboard`
- **CFO**: `yupiter871@gmail.com` → `/cfo/dashboard`
- **HR**: `zavgorodni22@gmail.com` → `/hr/dashboard`

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ:

### ОБНОВЛЕНО: HR ПОЛЬЗОВАТЕЛЬ
✅ **HR теперь отдельный сотрудник:**
- Email: `zavgorodni22@gmail.com`
- UUID: `f9928513-e6d1-45f1-a911-fae70ecf56a7`
- Имя: Анна Загородняя

**Больше нет дублирования email - каждый пользователь уникален!**

### РЕКОМЕНДУЕМЫЕ ПАРОЛИ:
- Создайте временные пароли (например: `TempPass123!`)
- Попросите пользователей сменить при первом входе
- Используйте сложные пароли для безопасности

## 🔍 ПРОВЕРКА РЕЗУЛЬТАТА:

После выполнения SQL запросов проверьте:
```sql
SELECT email, role, status, first_name, last_name 
FROM users 
WHERE status = 'active' 
ORDER BY role;
```

Должно быть 5 активных пользователей с разными ролями.

## 🎯 СЛЕДУЮЩИЕ ШАГИ:
1. Отправьте пользователям их учетные данные
2. Попросите сменить пароли при первом входе  
3. Проверьте доступ к соответствующим дашбордам
4. При необходимости настройте дополнительные права доступа
