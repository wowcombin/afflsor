import { createClient } from '@/lib/supabase/server'

export interface NotificationData {
    user_ids: string[]
    type: string
    title: string
    message: string
    sender_id?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    metadata?: any
    action_url?: string
}

/**
 * Отправить уведомление пользователям
 */
export async function sendNotification(data: NotificationData) {
    try {
        const supabase = await createClient()

        // Создаем уведомления через API функцию
        const { data: result, error } = await supabase
            .rpc('create_bulk_notifications', {
                p_user_ids: data.user_ids,
                p_type: data.type,
                p_title: data.title,
                p_message: data.message,
                p_sender_id: data.sender_id || null,
                p_priority: data.priority || 'normal',
                p_metadata: data.metadata || {},
                p_action_url: data.action_url || null
            })

        if (error) {
            console.error('Error sending notification:', error)
            return { success: false, error: error.message }
        }

        console.log('✅ Notifications sent:', {
            count: result,
            type: data.type,
            title: data.title
        })

        return { success: true, count: result }
    } catch (error: any) {
        console.error('Notification helper error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Отправить уведомление о назначении банка TeamLead'у
 */
export async function notifyBankAssignment(teamleadId: string, bankName: string, senderId: string) {
    return sendNotification({
        user_ids: [teamleadId],
        type: 'bank_assignment',
        title: 'Назначен новый банк',
        message: `Вам назначен банк "${bankName}" для выпуска карт команде.`,
        sender_id: senderId,
        priority: 'high',
        metadata: { bank_name: bankName },
        action_url: '/dashboard/teamlead/banks'
    })
}

/**
 * Отправить уведомление о назначении карты Junior'у
 */
export async function notifyCardAssignment(juniorId: string, cardMask: string, senderId: string) {
    return sendNotification({
        user_ids: [juniorId],
        type: 'card_assignment',
        title: 'Назначена новая карта',
        message: `Вам назначена банковская карта *${cardMask} для работы.`,
        sender_id: senderId,
        priority: 'high',
        metadata: { card_mask: cardMask },
        action_url: '/dashboard/junior/payment-methods'
    })
}

/**
 * Отправить уведомление о выпуске новой карты
 */
export async function notifyCardIssued(teamleadId: string, cardMask: string, bankName: string) {
    return sendNotification({
        user_ids: [teamleadId],
        type: 'card_issued',
        title: 'Карта успешно выпущена',
        message: `Новая карта *${cardMask} выпущена из банка "${bankName}".`,
        priority: 'normal',
        metadata: { card_mask: cardMask, bank_name: bankName },
        action_url: '/dashboard/teamlead/cards'
    })
}

/**
 * Отправить уведомление о новом выводе на проверку
 */
export async function notifyWithdrawalPending(teamleadId: string, juniorName: string, amount: number, currency: string, senderId: string) {
    return sendNotification({
        user_ids: [teamleadId],
        type: 'withdrawal_pending',
        title: 'Новый вывод на проверку',
        message: `${juniorName} создал вывод на ${amount} ${currency}. Требуется проверка.`,
        sender_id: senderId,
        priority: 'high',
        metadata: {
            junior_name: juniorName,
            amount,
            currency
        },
        action_url: '/dashboard/teamlead/withdrawals'
    })
}

/**
 * Отправить уведомление об одобрении вывода
 */
export async function notifyWithdrawalApproved(juniorId: string, amount: number, currency: string, senderId: string) {
    return sendNotification({
        user_ids: [juniorId],
        type: 'withdrawal_approved',
        title: 'Вывод одобрен',
        message: `Ваш вывод на ${amount} ${currency} одобрен и обрабатывается.`,
        sender_id: senderId,
        priority: 'normal',
        metadata: { amount, currency },
        action_url: '/dashboard/junior/withdrawals'
    })
}

/**
 * Отправить уведомление о блокировке вывода
 */
export async function notifyWithdrawalBlocked(juniorId: string, amount: number, currency: string, reason: string, senderId: string) {
    return sendNotification({
        user_ids: [juniorId],
        type: 'withdrawal_blocked',
        title: 'Вывод заблокирован',
        message: `Ваш вывод на ${amount} ${currency} заблокирован. Причина: ${reason}`,
        sender_id: senderId,
        priority: 'urgent',
        metadata: {
            amount,
            currency,
            reason
        },
        action_url: '/dashboard/junior/withdrawals'
    })
}

/**
 * Отправить уведомление о блокировке аккаунта
 */
export async function notifyAccountBlocked(userIds: string[], accountType: string, reason: string, senderId: string) {
    return sendNotification({
        user_ids: userIds,
        type: 'account_blocked',
        title: 'Аккаунт заблокирован',
        message: `${accountType} аккаунт заблокирован. Причина: ${reason}`,
        sender_id: senderId,
        priority: 'urgent',
        metadata: {
            account_type: accountType,
            reason
        }
    })
}

/**
 * Отправить уведомление о назначении казино
 */
export async function notifyCasinoAssignment(juniorId: string, casinoName: string, senderId: string) {
    return sendNotification({
        user_ids: [juniorId],
        type: 'casino_assignment',
        title: 'Назначено новое казино',
        message: `Вам назначено казино "${casinoName}" для работы.`,
        sender_id: senderId,
        priority: 'normal',
        metadata: { casino_name: casinoName },
        action_url: '/dashboard/junior/work/new'
    })
}

/**
 * Отправить уведомление о назначении задачи
 */
export async function notifyTaskAssigned(juniorId: string, taskTitle: string, senderId: string) {
    return sendNotification({
        user_ids: [juniorId],
        type: 'task_assigned',
        title: 'Назначена новая задача',
        message: `Вам назначена задача: "${taskTitle}"`,
        sender_id: senderId,
        priority: 'normal',
        metadata: { task_title: taskTitle },
        action_url: '/dashboard/junior/tasks'
    })
}

/**
 * Отправить уведомление о выполнении задачи
 */
export async function notifyTaskCompleted(teamleadId: string, taskTitle: string, juniorName: string, senderId: string) {
    return sendNotification({
        user_ids: [teamleadId],
        type: 'task_completed',
        title: 'Задача выполнена',
        message: `${juniorName} выполнил задачу: "${taskTitle}"`,
        sender_id: senderId,
        priority: 'normal',
        metadata: {
            task_title: taskTitle,
            junior_name: juniorName
        },
        action_url: '/dashboard/teamlead/tasks'
    })
}

/**
 * Отправить системное уведомление всем пользователям определенной роли
 */
export async function notifySystemAlert(userIds: string[], title: string, message: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') {
    return sendNotification({
        user_ids: userIds,
        type: 'system_alert',
        title,
        message,
        priority,
        metadata: { system: true }
    })
}

/**
 * Получить всех пользователей определенной роли для массовых уведомлений
 */
export async function getUsersByRole(role: string): Promise<string[]> {
    try {
        const supabase = await createClient()

        const { data: users, error } = await supabase
            .from('users')
            .select('id')
            .eq('role', role)
            .eq('status', 'active')

        if (error) {
            console.error('Error fetching users by role:', error)
            return []
        }

        return users?.map(u => u.id) || []
    } catch (error) {
        console.error('Error in getUsersByRole:', error)
        return []
    }
}

/**
 * Получить TeamLead'а для Junior'а
 */
export async function getTeamLeadForJunior(juniorId: string): Promise<string | null> {
    try {
        const supabase = await createClient()

        const { data: junior, error } = await supabase
            .from('users')
            .select('team_lead_id')
            .eq('id', juniorId)
            .single()

        if (error || !junior?.team_lead_id) {
            return null
        }

        return junior.team_lead_id
    } catch (error) {
        console.error('Error getting teamlead for junior:', error)
        return null
    }
}
