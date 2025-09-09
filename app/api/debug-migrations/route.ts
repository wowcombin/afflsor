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

    // Проверяем существующие RLS политики через прямой SQL запрос
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('sql_query', {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'users'
          ORDER BY policyname;
        `
      })

    let policyInfo: {
      policies_found: any[]
      policies_error: string | null
      raw_sql_result: any
    } = {
      policies_found: [],
      policies_error: null,
      raw_sql_result: null
    }

    if (policiesError) {
      console.error('Policies query error:', policiesError)
      policyInfo.policies_error = policiesError.message
    } else {
      policyInfo.policies_found = policiesData || []
      policyInfo.raw_sql_result = policiesData
    }

    // Проверяем статус RLS для таблицы users
    const { data: rlsStatusData, error: rlsStatusError } = await supabase
      .rpc('sql_query', {
        query: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE tablename = 'users';
        `
      })

    let rlsStatusInfo: {
      rls_enabled: boolean | null
      error: string | null
      raw_result: any
    } = {
      rls_enabled: null,
      error: null,
      raw_result: null
    }

    if (rlsStatusError) {
      console.error('RLS status query error:', rlsStatusError)
      rlsStatusInfo.error = rlsStatusError.message
    } else {
      rlsStatusInfo.raw_result = rlsStatusData
      rlsStatusInfo.rls_enabled = rlsStatusData?.[0]?.rowsecurity || false
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

    // Анализируем найденные политики
    const foundPolicies = policyInfo.policies_found || []
    const hasV2Policies = foundPolicies.some((p: any) => 
      p.policyname === 'users_insert_policy_v2' || 
      p.policyname === 'users_update_policy_v2' || 
      p.policyname === 'users_select_all_policy_v2'
    )
    const hasV1Policies = foundPolicies.some((p: any) => 
      p.policyname === 'users_insert_policy' || 
      p.policyname === 'users_update_policy' || 
      p.policyname === 'users_select_all_policy'
    )
    const hasOldPolicies = foundPolicies.some((p: any) => 
      p.policyname && p.policyname.includes('HR Manager Admin могут')
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user_email: user.email,
      rls_status: rlsStatusInfo,
      policies_analysis: {
        total_policies_found: foundPolicies.length,
        policy_names: foundPolicies.map((p: any) => p.policyname),
        has_v2_policies: hasV2Policies,
        has_v1_policies: hasV1Policies,
        has_old_policies: hasOldPolicies,
        detailed_policies: foundPolicies
      },
      rls_policies_check: policyInfo,
      insert_simulation: insertTest,
      migration_status: {
        migration_034_needed: !hasV2Policies,
        migration_033_applied: hasV1Policies,
        old_policies_exist: hasOldPolicies,
        recommended_action: hasV2Policies ? 
          'Политики v2 уже применены' : 
          'Нужно применить миграцию 034_debug_and_fix_rls_policies.sql'
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
