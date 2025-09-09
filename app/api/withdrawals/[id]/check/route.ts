import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Проверить вывод (Manager)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const withdrawalId = params.id
    
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

    if (!userData || !['manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только Manager и Admin могут проверять выводы' }, { status: 403 })
    }

    const body = await request.json()
    const { action, comment } = body

    // Валидация действия
    if (!['received', 'problem', 'block'].includes(action)) {
      return NextResponse.json({ error: 'Некорректное действие' }, { status: 400 })
    }

    // Используем безопасную функцию проверки
    const { data: result, error } = await supabase
      .rpc('check_withdrawal_safe', {
        p_withdrawal_id: withdrawalId,
        p_checker_id: userData.id,
        p_new_status: action,
        p_comment: comment || null
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const actionLabels = {
      received: 'одобрен',
      problem: 'отмечен как проблемный',
      block: 'заблокирован'
    }

    return NextResponse.json({
      success: true,
      message: `Вывод ${actionLabels[action as keyof typeof actionLabels]}`
    })

  } catch (error) {
    console.error('Check withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
