import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { convertToUSDSync } from '@/lib/currency'

export const dynamic = 'force-dynamic'

// GET - Получить список подчиненных Junior'ов для Team Lead
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

    console.log('Team Lead team request:', userData.id)

    // Получаем подчиненных Junior'ов
    const { data: juniors } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        telegram_username,
        status,
        salary_percentage,
        created_at
      `)
      .eq('team_lead_id', userData.id)
      .eq('role', 'junior')
      .order('created_at', { ascending: false })

    console.log('Found juniors:', juniors?.length || 0)

    if (!juniors || juniors.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        stats: {
          total_juniors: 0,
          active_juniors: 0,
          total_accounts: 0,
          successful_accounts: 0,
          monthly_profit: 0,
          teamlead_commission: 0
        }
      })
    }

    // Получаем курсы валют
    const rates = { USD: 0.95, GBP: 1.21, EUR: 1.05, CAD: 0.69 }

    // Текущий месяц
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const juniorIds = juniors.map(j => j.id)
    
    // Получаем работы команды за месяц
    const { data: works } = await supabase
      .from('works')
      .select(`
        id,
        deposit_amount,
        junior_id,
        created_at,
        casinos!inner(currency)
      `)
      .in('junior_id', juniorIds)
      .gte('created_at', startOfMonth.toISOString())

    console.log('Found works:', works?.length || 0)

    // Получаем все выводы команды
    const { data: withdrawals } = await supabase
      .from('work_withdrawals')
      .select('withdrawal_amount, status, work_id, created_at')

    console.log('Found withdrawals:', withdrawals?.length || 0)

    // Обрабатываем данные для каждого Junior'а
    const teamData = await Promise.all(juniors.map(async (junior) => {
      // Работы этого Junior'а за месяц
      const juniorWorks = works?.filter(w => w.junior_id === junior.id) || []
      
      // Выводы этого Junior'а
      const juniorWithdrawals = withdrawals?.filter(w => 
        juniorWorks.some(work => work.id === w.work_id)
      ) || []

      // Успешные выводы (статус received)
      const successfulWithdrawals = juniorWithdrawals.filter(w => w.status === 'received')
      
      // Расчет профита
      let monthlyProfit = 0
      juniorWorks.forEach(work => {
        const workWithdrawals = juniorWithdrawals.filter(w => w.work_id === work.id && w.status === 'received')
        workWithdrawals.forEach(w => {
          const currency = (work.casinos as any)?.currency || 'USD'
          const withdrawalUSD = convertToUSDSync(w.withdrawal_amount, currency, rates)
          const depositUSD = convertToUSDSync(work.deposit_amount, currency, rates)
          monthlyProfit += (withdrawalUSD - depositUSD)
        })
      })

      // Последняя активность
      const lastWork = juniorWorks.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      let lastActivity = null
      if (lastWork) {
        const workDate = new Date(lastWork.created_at)
        const today = new Date()
        const diffTime = Math.abs(today.getTime() - workDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays === 1) {
          lastActivity = 'Сегодня'
        } else if (diffDays === 2) {
          lastActivity = 'Вчера'
        } else {
          lastActivity = `${diffDays - 1} дн. назад`
        }
      }

      return {
        id: junior.id,
        name: `${junior.first_name} ${junior.last_name}`,
        email: junior.email,
        telegram: junior.telegram_username,
        status: junior.status,
        salary_percentage: junior.salary_percentage || 15,
        monthly_accounts: juniorWorks.length,
        successful_accounts: successfulWithdrawals.length,
        success_rate: juniorWorks.length > 0 ? Math.round((successfulWithdrawals.length / juniorWorks.length) * 100) : 0,
        monthly_profit: monthlyProfit,
        last_activity: lastActivity || 'Нет активности'
      }
    }))

    // Общая статистика команды
    const stats = {
      total_juniors: juniors.length,
      active_juniors: juniors.filter(j => j.status === 'active').length,
      total_accounts: teamData.reduce((sum, j) => sum + j.monthly_accounts, 0),
      successful_accounts: teamData.reduce((sum, j) => sum + j.successful_accounts, 0),
      monthly_profit: teamData.reduce((sum, j) => sum + j.monthly_profit, 0),
      teamlead_commission: teamData.reduce((sum, j) => sum + j.monthly_profit, 0) * 0.1 // 10% от брутто
    }

    console.log('Team Lead team stats:', stats)

    return NextResponse.json({ 
      success: true, 
      data: teamData,
      stats
    })

  } catch (error) {
    console.error('Team Lead team error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
