import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Расчет зарплат по новой схеме распределения доходов
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя (только CFO, Admin, CEO могут запускать расчет)
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['cfo', 'admin', 'ceo'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (userData.status !== 'active') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
    }

    const body = await request.json()
    const { month } = body // Формат: "2024-01"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 })
    }

    console.log(`Starting salary calculation for ${month} by user ${userData.id}`)

    // Вызываем обновленную функцию расчета зарплат (включая PayPal)
    const { data: salaryResults, error: calcError } = await supabase
      .rpc('calculate_monthly_salaries_v3', {
        p_month: month,
        p_calculated_by: userData.id
      })

    if (calcError) {
      console.error('Salary calculation error:', calcError)
      return NextResponse.json({ 
        error: 'Failed to calculate salaries', 
        details: calcError.message 
      }, { status: 500 })
    }

    console.log(`Salary calculation completed. Results:`, salaryResults)

    // Сохраняем результаты в таблицу salary_calculations
    const calculationsToInsert = salaryResults.map((result: any) => ({
      month,
      employee_id: result.employee_id,
      role: result.role,
      gross_profit: result.gross_profit,
      total_expenses: result.total_expenses,
      net_profit: result.net_profit,
      expense_percentage: result.expense_percentage,
      calculation_base: result.gross_profit,
      base_percentage: result.role === 'junior' ? 10 : 
                      result.role === 'teamlead' ? 10 :
                      result.role === 'manager' ? 10 :
                      result.role === 'hr' ? 5 :
                      result.role === 'cfo' ? 5 :
                      result.role === 'tester' ? 10 :
                      result.role === 'qa_assistant' ? 0 :
                      result.role === 'ceo' ? 0 : 0,
      base_salary: result.base_salary,
      performance_bonus: result.performance_bonus || 0,
      leader_bonus: result.leader_bonus || 0,
      is_month_leader: result.is_month_leader || false,
      largest_account_profit: result.leader_bonus ? result.leader_bonus / 0.1 : 0,
      total_salary: result.total_salary,
      calculated_by: userData.id,
      calculation_method: result.calculation_method
    }))

    // Удаляем старые расчеты за этот месяц
    const { error: deleteError } = await supabase
      .from('salary_calculations')
      .delete()
      .eq('month', month)

    if (deleteError) {
      console.error('Error deleting old calculations:', deleteError)
    }

    // Вставляем новые расчеты
    const { error: insertError } = await supabase
      .from('salary_calculations')
      .insert(calculationsToInsert)

    if (insertError) {
      console.error('Error inserting salary calculations:', insertError)
      return NextResponse.json({ 
        error: 'Failed to save salary calculations', 
        details: insertError.message 
      }, { status: 500 })
    }

    // Создаем уведомления для всех сотрудников о готовности зарплат
    const notifications = salaryResults.map((result: any) => ({
      user_id: result.employee_id,
      type: 'salary',
      title: 'Зарплата рассчитана',
      message: `Ваша зарплата за ${month} составляет $${result.total_salary.toFixed(2)}`,
      priority: 'medium',
      data: {
        month,
        amount: result.total_salary,
        calculation_method: result.calculation_method
      }
    }))

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notificationError) {
      console.error('Error creating notifications:', notificationError)
    }

    // Логируем действие
    await supabase
      .from('action_history')
      .insert({
        user_id: userData.id,
        action_type: 'create',
        target_type: 'salary_calculation',
        target_id: month,
        description: `Выполнен расчет зарплат за ${month} по новой схеме распределения доходов. Обработано ${salaryResults.length} сотрудников.`
      })

    return NextResponse.json({
      success: true,
      message: `Salary calculation completed for ${month}`,
      data: {
        month,
        employees_processed: salaryResults.length,
        total_payroll: salaryResults.reduce((sum: number, r: any) => sum + r.total_salary, 0),
        calculation_summary: {
          total_all: salaryResults[0]?.gross_profit || 0,
          total_expenses: salaryResults[0]?.total_expenses || 0,
          expense_percentage: salaryResults[0]?.expense_percentage || 0,
          calculation_method: salaryResults[0]?.calculation_method || 'unknown'
        },
        results: salaryResults
      }
    })

  } catch (error: any) {
    console.error('Salary calculation API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

// GET - Получить результаты расчета зарплат за месяц
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['cfo', 'admin', 'ceo', 'hr'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Формат: "2024-01"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 })
    }

    // Получаем расчеты зарплат за месяц
    const { data: calculations, error } = await supabase
      .from('salary_calculations')
      .select(`
        *,
        employee:employee_id (
          id,
          email,
          first_name,
          last_name,
          role
        ),
        calculated_by_user:calculated_by (
          email,
          first_name,
          last_name
        )
      `)
      .eq('month', month)
      .order('total_salary', { ascending: false })

    if (error) {
      console.error('Error fetching salary calculations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные для фронтенда
    const formattedResults = calculations.map(calc => ({
      id: calc.id,
      employee_id: calc.employee_id,
      employee_name: `${calc.employee.first_name || ''} ${calc.employee.last_name || ''}`.trim() || calc.employee.email,
      employee_email: calc.employee.email,
      role: calc.role,
      gross_profit: calc.gross_profit,
      total_expenses: calc.total_expenses,
      net_profit: calc.net_profit,
      expense_percentage: calc.expense_percentage,
      base_salary: calc.base_salary,
      performance_bonus: calc.performance_bonus,
      leader_bonus: calc.leader_bonus,
      total_salary: calc.total_salary,
      is_month_leader: calc.is_month_leader,
      calculation_method: calc.calculation_method,
      calculated_at: calc.created_at,
      calculated_by: `${calc.calculated_by_user.first_name || ''} ${calc.calculated_by_user.last_name || ''}`.trim() || calc.calculated_by_user.email
    }))

    const summary = {
      month,
      total_employees: calculations.length,
      total_payroll: calculations.reduce((sum, calc) => sum + calc.total_salary, 0),
      total_all: calculations[0]?.gross_profit || 0,
      total_expenses: calculations[0]?.total_expenses || 0,
      expense_percentage: calculations[0]?.expense_percentage || 0,
      calculation_method: calculations[0]?.calculation_method || 'unknown'
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        calculations: formattedResults
      }
    })

  } catch (error: any) {
    console.error('Get salary calculations API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
