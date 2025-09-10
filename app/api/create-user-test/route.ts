import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// СОВЕРШЕННО НОВЫЙ API ДЛЯ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЕЙ
export async function POST(request: Request) {
    const startTime = Date.now()

    try {
        console.log('🔥🔥🔥 НОВЕЙШИЙ API create-user-test ЗАПУЩЕН!', {
            timestamp: new Date().toISOString(),
            version: 'v3.0-completely-new'
        })

        const supabase = await createClient()

        // 1. Проверка аутентификации
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        console.log('✅ Auth check:', {
            hasUser: !!user,
            userEmail: user?.email,
            authError: authError?.message
        })

        if (!user) {
            return NextResponse.json({
                error: 'Не авторизован',
                version: 'v3.0-completely-new',
                step: 'auth_check'
            }, { status: 401 })
        }

        // 2. Получение данных пользователя
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, role, status')
            .eq('auth_id', user.id)
            .single()

        console.log('✅ User data check:', {
            userData,
            userError: userError?.message,
            hasUserData: !!userData
        })

        if (userError) {
            return NextResponse.json({
                error: 'Ошибка получения данных пользователя',
                details: userError.message,
                version: 'v3.0-completely-new',
                step: 'user_data_fetch'
            }, { status: 500 })
        }

        if (!userData) {
            return NextResponse.json({
                error: 'Пользователь не найден в системе',
                version: 'v3.0-completely-new',
                step: 'user_not_found'
            }, { status: 404 })
        }

        // 3. Проверка роли
        const allowedRoles = ['hr', 'admin', 'manager']
        const hasPermission = allowedRoles.includes(userData.role)

        console.log('✅ Permission check:', {
            userRole: userData.role,
            allowedRoles,
            hasPermission,
            isActive: userData.status === 'active'
        })

        if (!hasPermission) {
            return NextResponse.json({
                error: 'Недостаточно прав',
                details: `Роль '${userData.role}' не может создавать пользователей. Нужна роль: ${allowedRoles.join(', ')}`,
                version: 'v3.0-completely-new',
                step: 'permission_check',
                userRole: userData.role
            }, { status: 403 })
        }

        if (userData.status !== 'active') {
            return NextResponse.json({
                error: 'Аккаунт не активен',
                details: `Статус аккаунта: '${userData.status}', требуется: 'active'`,
                version: 'v3.0-completely-new',
                step: 'status_check'
            }, { status: 403 })
        }

        // 4. Получение данных из запроса
        const body = await request.json()
        console.log('✅ Request body:', body)

        const { email, password, first_name, last_name, role } = body

        if (!email || !password || !role) {
            return NextResponse.json({
                error: 'Не заполнены обязательные поля',
                details: 'Email, пароль и роль обязательны',
                version: 'v3.0-completely-new',
                step: 'validation'
            }, { status: 400 })
        }

        // 5. Создание пользователя в Auth
        console.log('🚀 Создаем пользователя в Supabase Auth...')

        const { data: authUser, error: authCreateError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })

        if (authCreateError) {
            console.error('❌ Auth creation error:', authCreateError)
            return NextResponse.json({
                error: 'Ошибка создания аккаунта',
                details: authCreateError.message,
                version: 'v3.0-completely-new',
                step: 'auth_creation'
            }, { status: 400 })
        }

        if (!authUser.user) {
            return NextResponse.json({
                error: 'Не удалось создать аккаунт',
                version: 'v3.0-completely-new',
                step: 'auth_user_missing'
            }, { status: 500 })
        }

        console.log('✅ Auth user created:', authUser.user.id)

        // 6. Создание записи в таблице users
        console.log('🚀 Создаем запись в таблице users...')

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                auth_id: authUser.user.id,
                email,
                first_name: first_name || null,
                last_name: last_name || null,
                role,
                status: 'active'
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ User insert error:', insertError)
            // Удаляем созданного auth пользователя
            await supabase.auth.admin.deleteUser(authUser.user.id)

            return NextResponse.json({
                error: 'Ошибка создания пользователя в системе',
                details: insertError.message,
                version: 'v3.0-completely-new',
                step: 'user_insert'
            }, { status: 500 })
        }

        console.log('✅ User created successfully:', newUser)

        const endTime = Date.now()

        return NextResponse.json({
            success: true,
            message: `Пользователь ${email} успешно создан`,
            user: newUser,
            version: 'v3.0-completely-new',
            executionTime: `${endTime - startTime}ms`,
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('🚨 Критическая ошибка:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            details: error.message,
            version: 'v3.0-completely-new',
            step: 'catch_block'
        }, { status: 500 })
    }
}
