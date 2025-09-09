import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - синхронизировать участников команд
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя (только HR и Admin могут синхронизировать)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('Starting team synchronization...')

    // Вызываем функцию синхронизации
    const { data: syncResult, error: syncError } = await supabase
      .rpc('manual_sync_teams')

    if (syncError) {
      console.error('Error during team synchronization:', syncError)
      return NextResponse.json({ 
        error: 'Failed to synchronize teams',
        details: syncError.message 
      }, { status: 500 })
    }

    console.log('Team synchronization completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Команды успешно синхронизированы',
      result: syncResult
    })

  } catch (error) {
    console.error('Team sync API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
