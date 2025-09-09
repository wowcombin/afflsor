import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { convertToUSDSync } from '@/lib/currency'

export const dynamic = 'force-dynamic'

// GET - Получить статистику дашборда для Team Lead
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'teamlead') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('Team Lead dashboard request:', userData.id)

    // Получаем подчиненных Junior'ов
    const { data: juniors } = await supabase
      .from('users')
      .select('id, first_name, last_name, status')
      .eq('team_lead_id', userData.id)
      .eq('role', 'junior')

    console.log('Found juniors:', juniors?.length || 0)

    const totalJuniors = juniors?.length || 0
    const activeJuniors = juniors?.filter(j => j.status === 'active').length || 0

    // Получаем работы подчиненных за текущий месяц
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const juniorIds = juniors?.map(j => j.id) || []
    
    let monthlyProfit = 0
    let totalWorks = 0
    let successfulWorks = 0
    let pendingWithdrawals = 0

    if (juniorIds.length > 0) {
      // Получаем работы команды
      const { data: works } = await supabase
        .from('works')
        .select('id, deposit_amount, junior_id, casinos!inner(currency)')
        .in('junior_id', juniorIds)
        .gte('created_at', startOfMonth.toISOString())

      totalWorks = works?.length || 0

      // Получаем выводы команды
      const { data: withdrawals } = await supabase
        .from('work_withdrawals')
        .select('withdrawal_amount, status, work_id')

      // Фильтруем выводы команды и считаем профит
      const rates = { USD: 0.95, GBP: 1.21, EUR: 1.05, CAD: 0.69 }
      
      works?.forEach(work => {
        const workWithdrawals = withdrawals?.filter(w => w.work_id === work.id) || []
        const receivedWithdrawals = workWithdrawals.filter(w => w.status === 'received')
        
        if (receivedWithdrawals.length > 0) {
          successfulWorks++
          
          receivedWithdrawals.forEach(w => {
            const currency = (work.casinos as any)?.currency || 'USD'
            const withdrawalUSD = convertToUSDSync(w.withdrawal_amount, currency, rates)
            const depositUSD = convertToUSDSync(work.deposit_amount, currency, rates)
            monthlyProfit += (withdrawalUSD - depositUSD)
          })
        }

        // Считаем ожидающие выводы
        const pendingWorkWithdrawals = workWithdrawals.filter(w => ['new', 'waiting'].includes(w.status))
        pendingWithdrawals += pendingWorkWithdrawals.length
      })
    }

    const successRate = totalWorks > 0 ? Math.round((successfulWorks / totalWorks) * 100) : 0
    const teamLeadCommission = monthlyProfit * 0.1 // 10% от брутто команды

    const stats = {
      totalJuniors,
      activeJuniors,
      monthlyProfit,
      teamLeadCommission,
      totalWorks,
      successRate,
      pendingWithdrawals
    }

    console.log('Team Lead stats:', stats)

    return NextResponse.json({ 
      success: true, 
      stats
    })

  } catch (error) {
    console.error('Team Lead dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
