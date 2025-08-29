import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка роли Manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userData?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    const alerts = []

    // 1. Заблокированные банковские аккаунты
    const { data: blockedAccounts } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        holder_name,
        banks!inner(name, country),
        cards(id)
      `)
      .eq('status', 'blocked')

    if (blockedAccounts && blockedAccounts.length > 0) {
      blockedAccounts.forEach(account => {
        const bank = Array.isArray(account.banks) ? account.banks[0] : account.banks
        alerts.push({
          id: `blocked_account_${account.id}`,
          type: 'critical',
          title: 'Заблокированный банковский аккаунт',
          description: `${bank?.name} - ${account.holder_name}`,
          details: `Карт затронуто: ${account.cards?.length || 0}`,
          actions: [
            { label: 'Разблокировать', action: 'unblock_account', data: { accountId: account.id } },
            { label: 'Переназначить карты', action: 'reassign_cards', data: { accountId: account.id } },
            { label: 'Создать новый банк', action: 'create_bank', data: {} }
          ],
          priority: 'high',
          impact: 'Остановка работы с картами',
          created_at: new Date().toISOString()
        })
      })
    }

    // 2. Непроверенные выводы > 4 часов
    const { data: oldWithdrawals } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        withdrawal_amount,
        created_at,
        works!inner(
          casino_username,
          users!inner(first_name, last_name, telegram_username),
          casinos!inner(name)
        )
      `)
      .in('status', ['new', 'waiting'])
      .lt('created_at', fourHoursAgo.toISOString())
      .order('created_at', { ascending: true })

    if (oldWithdrawals && oldWithdrawals.length > 0) {
      alerts.push({
        id: 'old_withdrawals',
        type: 'critical',
        title: `${oldWithdrawals.length} выводов ожидают > 4 часов`,
        description: 'Критическая задержка в обработке выводов',
        details: `Самый старый: ${Math.floor((now.getTime() - new Date(oldWithdrawals[0].created_at).getTime()) / (1000 * 60 * 60))} часов`,
        actions: [
          { label: 'Проверить все', action: 'bulk_check_withdrawals', data: { withdrawalIds: oldWithdrawals.map(w => w.id) } },
          { label: 'Приоритетная очередь', action: 'priority_queue', data: {} },
          { label: 'Уведомить HR', action: 'notify_hr', data: { reason: 'withdrawal_delay' } }
        ],
        priority: 'critical',
        impact: 'Недовольство Junior, потеря эффективности',
        created_at: oldWithdrawals[0].created_at
      })
    }

    // 3. Junior без активности > 2 часов с депозитом
    const { data: inactiveJuniors } = await supabase
      .from('works')
      .select(`
        junior_id,
        deposit_amount,
        created_at,
        users!inner(first_name, last_name, telegram_username)
      `)
      .eq('status', 'active')
      .lt('created_at', twoHoursAgo.toISOString())

    if (inactiveJuniors && inactiveJuniors.length > 0) {
      // Группируем по Junior
      const juniorMap = new Map()
      inactiveJuniors.forEach(work => {
        const user = Array.isArray(work.users) ? work.users[0] : work.users
        const juniorId = work.junior_id
        
        if (juniorMap.has(juniorId)) {
          const existing = juniorMap.get(juniorId)
          existing.depositAmount += work.deposit_amount
          existing.worksCount += 1
        } else {
          juniorMap.set(juniorId, {
            juniorId,
            name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
            telegram: user?.telegram_username,
            depositAmount: work.deposit_amount,
            worksCount: 1,
            lastActivity: work.created_at
          })
        }
      })

      juniorMap.forEach((juniorData, juniorId) => {
        alerts.push({
          id: `inactive_junior_${juniorId}`,
          type: 'warning',
          title: 'Junior неактивен с депозитом',
          description: `${juniorData.name} не активен > 2 часов`,
          details: `Депозитов: $${juniorData.depositAmount}, работ: ${juniorData.worksCount}`,
          actions: [
            { label: 'Связаться', action: 'contact_junior', data: { juniorId, telegram: juniorData.telegram } },
            { label: 'Освободить карты', action: 'release_cards', data: { juniorId } },
            { label: 'Создать задачу', action: 'create_task', data: { juniorId, reason: 'inactivity' } }
          ],
          priority: 'medium',
          impact: 'Замороженные депозиты, неэффективность',
          created_at: juniorData.lastActivity
        })
      })
    }

    // 4. Массовые блоки в казино (5+ подряд)
    const { data: recentBlocks } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        created_at,
        works!inner(
          casinos!inner(id, name)
        )
      `)
      .eq('status', 'block')
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

    // Группируем блоки по казино
    const casinoBlocks = new Map()
    recentBlocks?.forEach(block => {
      const work = Array.isArray(block.works) ? block.works[0] : block.works
      const casino = Array.isArray(work?.casinos) ? work.casinos[0] : work?.casinos
      const casinoId = casino?.id
      
      if (casinoId) {
        if (casinoBlocks.has(casinoId)) {
          casinoBlocks.get(casinoId).count += 1
        } else {
          casinoBlocks.set(casinoId, {
            casinoId,
            name: casino.name,
            count: 1,
            lastBlock: block.created_at
          })
        }
      }
    })

    // Ищем казино с 5+ блоками
    casinoBlocks.forEach((casinoData, casinoId) => {
      if (casinoData.count >= 5) {
        alerts.push({
          id: `casino_blocks_${casinoId}`,
          type: 'critical',
          title: 'Массовые блоки в казино',
          description: `${casinoData.name}: ${casinoData.count} блоков за 24ч`,
          details: `Последний блок: ${new Date(casinoData.lastBlock).toLocaleTimeString('ru-RU')}`,
          actions: [
            { label: 'Остановить казино', action: 'pause_casino', data: { casinoId } },
            { label: 'Изменить стратегию', action: 'change_strategy', data: { casinoId } },
            { label: 'Анализ проблемы', action: 'analyze_casino', data: { casinoId } }
          ],
          priority: 'critical',
          impact: 'Потеря профита, репутационные риски',
          created_at: casinoData.lastBlock
        })
      }
    })

    // Сортируем алерты по приоритету и времени
    alerts.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.type === 'critical').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        hasUrgent: alerts.some(a => a.priority === 'critical')
      }
    })

  } catch (error) {
    console.error('Ошибка загрузки критических алертов:', error)
    return NextResponse.json({
      error: 'Ошибка загрузки алертов'
    }, { status: 500 })
  }
}
