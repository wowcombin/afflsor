import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Проверка роли CFO/Admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user?.id)
    .single()
    
  if (!currentUser || !['cfo', 'admin'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Получить начало прошлого месяца
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0)

    // Получить всех активных junior/tester
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, salary_percentage, salary_bonus')
      .in('role', ['junior', 'tester'])
      .eq('status', 'active')

    const calculations = []

    for (const user of users || []) {
      // Получить все received выводы за месяц
      const { data: withdrawals } = await supabase
        .from('work_withdrawals')
        .select(`
          withdrawal_amount,
          works!inner(
            deposit_amount,
            junior_id,
            work_date
          )
        `)
        .eq('status', 'received')
        .eq('works.junior_id', user.id)
        .gte('works.work_date', startDate.toISOString())
        .lte('works.work_date', endDate.toISOString())

      // Рассчитать профит
      const profit = withdrawals?.reduce((sum, w: any) => {
        return sum + (w.withdrawal_amount - w.works.deposit_amount)
      }, 0) || 0

      // Рассчитать зарплату
      const baseSalary = profit * (user.salary_percentage / 100)
      const totalSalary = baseSalary + user.salary_bonus

      // Сохранить расчет
      const { error } = await supabase
        .from('salary_calculations')
        .upsert({
          user_id: user.id,
          month: startDate.toISOString().split('T')[0],
          gross_profit: profit,
          base_salary: baseSalary,
          bonus: user.salary_bonus,
          total_salary: totalSalary,
          paid: false
        }, {
          onConflict: 'user_id,month'
        })

      if (!error) {
        calculations.push({
          user_id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          profit,
          percentage: user.salary_percentage,
          bonus: user.salary_bonus,
          total_salary: totalSalary
        })
      }
    }

    // Логирование в audit
    await supabase.from('audit_log').insert({
      user_id: user?.id,
      action: 'SALARY_CALCULATION',
      table_name: 'salary_calculations',
      new_values: { 
        month: startDate.toISOString().split('T')[0], 
        count: calculations.length,
        total_amount: calculations.reduce((sum, c) => sum + c.total_salary, 0)
      }
    })

    return NextResponse.json({
      month: startDate.toISOString().split('T')[0],
      calculations,
      total: calculations.reduce((sum, c) => sum + c.total_salary, 0)
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
