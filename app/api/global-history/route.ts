import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить общую историю всех действий
export async function GET(request: Request) {
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

    if (!userData || !['cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут просматривать общую историю' }, { status: 403 })
    }

    // Получаем историю действий из новой таблицы
    const { data: actionHistory, error: historyError } = await supabase
      .from('action_history_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    // Форматируем данные для отображения
    const formattedHistory = actionHistory.map(entry => {
      return {
        id: entry.id,
        action: entry.change_description,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_name: entry.entity_name,
        entity_details: entry.entity_details,
        old_values: entry.old_values,
        new_values: entry.new_values,
        user: {
          name: `${entry.first_name} ${entry.last_name}`,
          email: entry.email,
          role: entry.role
        },
        created_at: entry.created_at,
        ip_address: entry.ip_address
      }
    })

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      total: formattedHistory.length
    })

  } catch (error) {
    console.error('Global history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
