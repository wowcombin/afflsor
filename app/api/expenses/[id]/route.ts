import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'



// DELETE - Удалить расход
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const expenseId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут удалять расходы' }, { status: 403 })
    }

    // Получаем информацию о расходе для логирования
    const { data: expense, error: getExpenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (getExpenseError) {
      console.error('Get expense error:', getExpenseError)
      return NextResponse.json({ error: `Ошибка получения расхода: ${getExpenseError.message}` }, { status: 500 })
    }

    if (!expense) {
      return NextResponse.json({ error: 'Расход не найден' }, { status: 404 })
    }

    // Логируем удаление расхода
    await supabase.rpc('log_action', {
      p_action_type: 'expense_deleted',
      p_entity_type: 'expense',
      p_entity_id: expenseId,
      p_entity_name: `${expense.category}: ${expense.description}`,
      p_change_description: `Удален расход: ${expense.category} - ${expense.description} (${expense.currency}${expense.amount})`,
      p_performed_by: userData.id,
      p_old_values: { category: expense.category, description: expense.description, amount: expense.amount },
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    // Удаляем расход
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (deleteError) {
      console.error('Delete expense error:', deleteError)
      return NextResponse.json({ error: `Ошибка удаления: ${deleteError.message}` }, { status: 500 })
    }

    console.log('Expense deleted successfully:', expenseId)

    return NextResponse.json({
      success: true,
      message: `Расход "${expense.description}" удален`
    })

  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
