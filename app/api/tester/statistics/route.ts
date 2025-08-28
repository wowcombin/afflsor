import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка роли Tester
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userData?.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получение статистики тестера
    const { data: stats, error: statsError } = await supabase
      .from('tester_statistics')
      .select('*')
      .eq('tester_id', user.id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: statsError.message }, { status: 500 })
    }

    // Получение активных тестов
    const { data: activeTests, error: testsError } = await supabase
      .from('active_casino_tests')
      .select('*')
      .eq('tester_id', user.id)
      .order('created_at', { ascending: true })

    if (testsError) {
      return NextResponse.json({ error: testsError.message }, { status: 500 })
    }

    return NextResponse.json({
      statistics: stats || {
        total_tests: 0,
        completed_tests: 0,
        approved_tests: 0,
        rejected_tests: 0,
        avg_registration_time: 0,
        avg_withdrawal_time: 0
      },
      activeTests: activeTests || []
    })

  } catch (error) {
    console.error('Tester statistics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
