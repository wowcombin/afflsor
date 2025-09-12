import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить уведомления пользователя
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        
        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Получаем данные пользователя
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.status !== 'active') {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
        }

        // Параметры запроса
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')
        const unreadOnly = searchParams.get('unread_only') === 'true'
        const type = searchParams.get('type')

        // Строим запрос
        let query = supabase
            .from('notifications')
            .select(`
                id,
                type,
                priority,
                title,
                message,
                metadata,
                action_url,
                is_read,
                read_at,
                show_sound,
                show_popup,
                created_at,
                expires_at,
                sender:sender_id(id, name, email, role)
            `)
            .eq('user_id', userData.id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })

        // Фильтры
        if (unreadOnly) {
            query = query.eq('is_read', false)
        }
        
        if (type) {
            query = query.eq('type', type)
        }

        // Пагинация
        query = query.range(offset, offset + limit - 1)

        const { data: notifications, error } = await query

        if (error) {
            console.error('Error fetching notifications:', error)
            return NextResponse.json({
                error: 'Failed to fetch notifications',
                details: error.message
            }, { status: 500 })
        }

        // Получаем общее количество непрочитанных
        const { data: unreadCountData } = await supabase
            .rpc('get_unread_notifications_count', { p_user_id: userData.id })

        const unreadCount = unreadCountData || 0

        console.log('✅ Notifications fetched:', {
            userEmail: user.email,
            count: notifications?.length || 0,
            unreadCount
        })

        return NextResponse.json({
            success: true,
            notifications: notifications || [],
            unread_count: unreadCount,
            pagination: {
                limit,
                offset,
                has_more: notifications?.length === limit
            }
        })

    } catch (error: any) {
        console.error('Notifications API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// POST - Создать новое уведомление (только для admin/hr/manager)
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        
        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли отправителя
        const { data: senderData } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('auth_id', user.id)
            .single()

        if (!senderData || senderData.status !== 'active') {
            return NextResponse.json({ error: 'Sender not found or inactive' }, { status: 404 })
        }

        // Проверяем права на создание уведомлений
        const allowedRoles = ['admin', 'hr', 'manager', 'teamlead']
        if (!allowedRoles.includes(senderData.role)) {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Only admin, hr, manager, and teamlead can create notifications'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            user_ids,
            type,
            title,
            message,
            priority = 'normal',
            metadata = {},
            action_url,
            show_sound = true,
            show_popup = true
        } = body

        // Валидация
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return NextResponse.json({
                error: 'Invalid user_ids',
                details: 'user_ids must be a non-empty array'
            }, { status: 400 })
        }

        if (!type || !title || !message) {
            return NextResponse.json({
                error: 'Missing required fields',
                details: 'type, title, and message are required'
            }, { status: 400 })
        }

        // Проверяем существование получателей
        const { data: recipients } = await supabase
            .from('users')
            .select('id')
            .in('id', user_ids)
            .eq('status', 'active')

        if (!recipients || recipients.length === 0) {
            return NextResponse.json({
                error: 'No valid recipients found',
                details: 'None of the specified user_ids correspond to active users'
            }, { status: 400 })
        }

        const validUserIds = recipients.map(r => r.id)

        // Создаем уведомления
        const { data: result } = await supabase
            .rpc('create_bulk_notifications', {
                p_user_ids: validUserIds,
                p_sender_id: senderData.id,
                p_type: type,
                p_title: title,
                p_message: message,
                p_priority: priority,
                p_metadata: metadata,
                p_action_url: action_url
            })

        const createdCount = result || 0

        console.log('✅ Bulk notifications created:', {
            senderEmail: user.email,
            type,
            recipientCount: createdCount,
            title
        })

        return NextResponse.json({
            success: true,
            created_count: createdCount,
            message: `Created ${createdCount} notifications`
        })

    } catch (error: any) {
        console.error('Create notifications error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// PATCH - Отметить уведомления как прочитанные
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        
        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Получаем данные пользователя
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.status !== 'active') {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
        }

        const body = await request.json()
        const { notification_ids, mark_all = false } = body

        let updatedCount = 0

        if (mark_all) {
            // Отмечаем все непрочитанные уведомления
            const { data: result } = await supabase
                .rpc('mark_notifications_as_read', {
                    p_user_id: userData.id,
                    p_notification_ids: null
                })
            updatedCount = result || 0
        } else if (notification_ids && Array.isArray(notification_ids)) {
            // Отмечаем конкретные уведомления
            const { data: result } = await supabase
                .rpc('mark_notifications_as_read', {
                    p_user_id: userData.id,
                    p_notification_ids: notification_ids
                })
            updatedCount = result || 0
        } else {
            return NextResponse.json({
                error: 'Invalid request',
                details: 'Either set mark_all=true or provide notification_ids array'
            }, { status: 400 })
        }

        console.log('✅ Notifications marked as read:', {
            userEmail: user.email,
            updatedCount,
            markAll: mark_all
        })

        return NextResponse.json({
            success: true,
            updated_count: updatedCount,
            message: `Marked ${updatedCount} notifications as read`
        })

    } catch (error: any) {
        console.error('Mark notifications as read error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
