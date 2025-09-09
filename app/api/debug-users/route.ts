import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Диагностика данных пользователей
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (Manager, HR, Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['manager', 'hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('=== ДИАГНОСТИКА ПОЛЬЗОВАТЕЛЕЙ ===')

    // Получаем сырые данные из базы
    const { data: rawUsers, error: rawError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        team_lead_id,
        team_lead:team_lead_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('role', 'junior')
      .order('created_at', { ascending: false })

    console.log('Raw users data:', JSON.stringify(rawUsers, null, 2))
    console.log('Raw error:', rawError)

    if (rawError) {
      return NextResponse.json({ error: rawError.message, rawError }, { status: 500 })
    }

    // Обрабатываем данные
    const processedUsers = rawUsers?.map(user => {
      console.log(`Processing user ${user.email}:`)
      console.log(`  - team_lead_id: ${user.team_lead_id}`)
      console.log(`  - team_lead object:`, user.team_lead)
      
      const team_lead_name = user.team_lead 
        ? `${(user.team_lead as any).first_name || ''} ${(user.team_lead as any).last_name || ''}`.trim() || (user.team_lead as any).email
        : null
      
      console.log(`  - computed team_lead_name: ${team_lead_name}`)
      
      return {
        ...user,
        team_lead_name
      }
    })

    console.log('Processed users:', JSON.stringify(processedUsers, null, 2))

    return NextResponse.json({ 
      success: true,
      rawUsers,
      processedUsers,
      count: processedUsers?.length || 0
    })

  } catch (error: any) {
    console.error('Debug users error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}
