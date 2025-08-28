import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { period } = await request.json()

    // Проверка роли CFO
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userData?.role !== 'cfo') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Определяем период
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()
    
    switch (period) {
      case 'current_month':
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }

    // Получить все успешные выводы за период
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('work_withdrawals')
      .select(`
        withdrawal_amount,
        works!inner(
          deposit_amount,
          junior_id,
          work_date,
          users!inner(id, first_name, last_name, salary_percentage, salary_bonus)
        )
      `)
      .eq('status', 'received')
      .gte('works.work_date', startDate.toISOString())
      .lte('works.work_date', endDate.toISOString())

    if (withdrawalsError) {
      return NextResponse.json({ error: withdrawalsError.message }, { status: 500 })
    }

    // Группировка по junior'ам и расчет зарплат
    const juniorCalculations = new Map()

    withdrawals?.forEach(withdrawal => {
      const profit = withdrawal.withdrawal_amount - withdrawal.works.deposit_amount
      const juniorId = withdrawal.works.junior_id
      const junior = withdrawal.works.users
      
      if (juniorCalculations.has(juniorId)) {
        const existing = juniorCalculations.get(juniorId)
        existing.totalProfit += profit
        existing.worksCount += 1
      } else {
        juniorCalculations.set(juniorId, {
          juniorId,
          firstName: junior.first_name || '',
          lastName: junior.last_name || '',
          salaryPercentage: junior.salary_percentage,
          salaryBonus: junior.salary_bonus,
          totalProfit: profit,
          worksCount: 1
        })
      }
    })

    // Сохранение расчетов в базу данных
    const calculations = []
    let totalProcessed = 0

    for (const [juniorId, data] of juniorCalculations) {
      const grossProfit = data.totalProfit
      const baseSalary = (grossProfit * data.salaryPercentage) / 100
      const totalSalary = baseSalary + data.salaryBonus

      const calculation = {
        junior_id: juniorId,
        calculation_period: startDate.toISOString().slice(0, 7), // YYYY-MM format
        gross_profit: grossProfit,
        base_salary: baseSalary,
        bonus: data.salaryBonus,
        penalties: 0, // Пока без штрафов
        total_salary: totalSalary,
        works_count: data.worksCount,
        calculated_by: user.id,
        calculated_at: new Date().toISOString(),
        status: 'calculated'
      }

      calculations.push(calculation)
      totalProcessed++
    }

    // Вставка расчетов в базу (upsert для обновления существующих)
    if (calculations.length > 0) {
      const { error: insertError } = await supabase
        .from('salary_calculations')
        .upsert(calculations, {
          onConflict: 'junior_id, calculation_period'
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Зарплаты успешно рассчитаны',
      processed: totalProcessed,
      totalAmount: calculations.reduce((sum, calc) => sum + calc.total_salary, 0),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: getPeriodLabel(period)
      }
    })

  } catch (error) {
    console.error('Ошибка расчета зарплат:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}

function getPeriodLabel(period: string): string {
  const labels: { [key: string]: string } = {
    current_month: 'Текущий месяц',
    last_month: 'Прошлый месяц',
    last_3_months: 'Последние 3 месяца',
    current_year: 'Текущий год'
  }
  return labels[period] || period
}
