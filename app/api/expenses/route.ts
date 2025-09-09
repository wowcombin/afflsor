import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить список расходов
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут просматривать расходы' }, { status: 403 })
    }

    // Получаем расходы из БД (без фильтрации по статусу)
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses_view')
      .select('*')
      .order('created_at', { ascending: false })

    if (expensesError) {
      return NextResponse.json({ error: expensesError.message }, { status: 500 })
    }

    // Рассчитываем простую статистику
    const statistics = {
      total_expenses: expensesData?.length || 0,
      total_amount_usd: expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      this_month_amount: expensesData?.filter(e => {
        try {
          const expenseDate = new Date(e.expense_date || e.date)
          const currentMonth = new Date().getMonth()
          return expenseDate.getMonth() === currentMonth
        } catch {
          return false
        }
      }).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      last_month_amount: expensesData?.filter(e => {
        try {
          const expenseDate = new Date(e.expense_date || e.date)
          const lastMonth = new Date().getMonth() - 1
          return expenseDate.getMonth() === lastMonth
        } catch {
          return false
        }
      }).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      by_category: expensesData?.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
        return acc
      }, {} as Record<string, number>) || {}
    }

    return NextResponse.json({
      expenses: expensesData || [],
      statistics
    })

  } catch (error) {
    console.error('Get expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый расход
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['cfo', 'admin', 'hr'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только CFO, Admin и HR могут создавать расходы' }, { status: 403 })
    }

    const body = await request.json()
    const { category, description, amount, currency, date } = body

    // Валидация
    if (!category || !description || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Все поля обязательны и сумма должна быть больше 0' }, { status: 400 })
    }

    // Создаем расход в БД
    const { data: newExpense, error: createError } = await supabase
      .from('expenses')
      .insert({
        category,
        description,
        amount,
        currency,
        expense_date: date,
        created_by: userData.id
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Логируем создание расхода
    await supabase.rpc('log_action', {
      p_action_type: 'expense_created',
      p_entity_type: 'expense',
      p_entity_id: newExpense.id,
      p_entity_name: `${category}: ${description}`,
      p_change_description: `Создан расход: ${category} - ${description} (${currency}${amount})`,
      p_performed_by: userData.id,
      p_new_values: { category, description, amount, currency, date },
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    return NextResponse.json({
      success: true,
      expense: newExpense,
      message: `Расход "${description}" создан`
    })

  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
