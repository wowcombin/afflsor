import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Simple Analytics API called at:', new Date().toISOString())
    
    const supabase = await createClient()

    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', user.email)

    // Тестируем каждую таблицу по отдельности
    const results: any = {}

    // 1. Тест users
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, role, created_at')
        .eq('role', 'junior')

      results.users = {
        success: !usersError,
        error: usersError?.message,
        count: usersData?.length || 0
      }
    } catch (error) {
      results.users = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 2. Тест works
    try {
      const { data: worksData, error: worksError } = await supabase
        .from('works')
        .select('id, junior_id, created_at')
        .limit(5)

      results.works = {
        success: !worksError,
        error: worksError?.message,
        count: worksData?.length || 0
      }
    } catch (error) {
      results.works = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 3. Тест work_withdrawals
    try {
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('work_withdrawals')
        .select('id, status, created_at')
        .limit(5)

      results.work_withdrawals = {
        success: !withdrawalsError,
        error: withdrawalsError?.message,
        count: withdrawalsData?.length || 0
      }
    } catch (error) {
      results.work_withdrawals = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 4. Тест casinos
    try {
      const { data: casinosData, error: casinosError } = await supabase
        .from('casinos')
        .select('id, name, currency')
        .limit(5)

      results.casinos = {
        success: !casinosError,
        error: casinosError?.message,
        count: casinosData?.length || 0
      }
    } catch (error) {
      results.casinos = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 5. Тест сложного запроса
    try {
      const { data: complexData, error: complexError } = await supabase
        .from('work_withdrawals')
        .select(`
          id,
          status,
          works!inner(
            junior_id,
            deposit_amount,
            casinos!inner(name, currency)
          )
        `)
        .limit(1)

      results.complex_query = {
        success: !complexError,
        error: complexError?.message,
        count: complexData?.length || 0
      }
    } catch (error) {
      results.complex_query = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    console.log('Test results:', results)

    return NextResponse.json({
      message: 'API тестирование завершено',
      user_email: user.email,
      results
    })

  } catch (error) {
    console.error('Simple Analytics API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
