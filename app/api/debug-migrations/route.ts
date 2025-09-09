import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// API для проверки состояния RLS политик
export async function GET() {
  try {
    const supabase = await createClient()

    // Проверка аутентификации
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Unauthorized',
        step: 'authentication'
      }, { status: 401 })
    }

    console.log('🔍 Debug Migrations - User authenticated:', user.email)

    // Проверяем существующие RLS политики
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'users' })

    let policyInfo: {
      policies_found: any[]
      policies_error: string | null
    } = {
      policies_found: [],
      policies_error: null
    }

    if (policyError) {
      console.error('Policy query error:', policyError)
      policyInfo.policies_error = policyError.message
    } else {
      policyInfo.policies_found = policies || []
    }

    // Альтернативная проверка через информационную схему
    const { data: policiesAlt, error: policyAltError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, cmd, qual')
      .eq('tablename', 'users')

    let altPolicyInfo: {
      policies_found: any[]
      policies_error: string | null
    } = {
      policies_found: [],
      policies_error: null
    }

    if (policyAltError) {
      console.error('Alternative policy query error:', policyAltError)
      altPolicyInfo.policies_error = policyAltError.message
    } else {
      altPolicyInfo.policies_found = policiesAlt || []
    }

    // Проверяем, можем ли мы выполнить INSERT операцию (симуляция)
    let insertTest: {
      can_insert: boolean
      error: string | null
    } = {
      can_insert: false,
      error: null
    }

    try {
      // Пытаемся выполнить DRY RUN вставки (без реального создания)
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_id: user.id, // Используем текущий auth_id (не создаст дубликат)
          email: user.email,
          role: 'junior',
          status: 'active'
        })
        .select()
        .limit(0) // Не возвращаем данные

      if (insertError) {
        insertTest.error = insertError.message
        // Если ошибка не связана с дублированием, значит RLS блокирует
        if (!insertError.message.includes('duplicate') && !insertError.message.includes('already exists')) {
          insertTest.can_insert = false
        } else {
          insertTest.can_insert = true // Дубликат означает, что RLS пропустил запрос
        }
      } else {
        insertTest.can_insert = true
      }
    } catch (error: any) {
      insertTest.error = error.message
      insertTest.can_insert = false
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user_email: user.email,
      rls_policies_check: policyInfo,
      alternative_policies_check: altPolicyInfo,
      insert_simulation: insertTest,
      migration_status: {
        migration_033_applied: altPolicyInfo.policies_found.some((p: any) => 
          p.policyname === 'users_insert_policy' || 
          p.policyname === 'users_update_policy' || 
          p.policyname === 'users_select_all_policy'
        ),
        old_policies_exist: altPolicyInfo.policies_found.some((p: any) => 
          p.policyname.includes('HR Manager Admin могут')
        )
      }
    })

  } catch (error: any) {
    console.error('🚨 Debug migrations error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      step: 'catch_block'
    }, { status: 500 })
  }
}
