import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - Получить данные текущего пользователя
export async function GET() {
  try {
    const supabase = await createClient()

    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем данные пользователя из базы
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single()

    if (userError) {
      console.error('User not found in database:', userError)
      return NextResponse.json({
        error: 'User not found in system. Please contact administrator.'
      }, { status: 404 })
    }

    return NextResponse.json({ user: userData })

  } catch (error) {
    console.error('Get user data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Обновить данные текущего пользователя
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user ID:', user.id)

    const body = await request.json()
    console.log('Request body:', body)

    const { name, surname, telegram_username, usdt_wallet, phone } = body

    // Валидация данных
    const updateData: any = {}

    if (name !== undefined) {
      updateData.first_name = name?.trim() || null
    }

    if (surname !== undefined) {
      updateData.last_name = surname?.trim() || null
    }

    if (telegram_username !== undefined) {
      const cleanUsername = telegram_username?.trim()?.replace('@', '') || null
      if (cleanUsername) {
        // Валидация Telegram username
        const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/
        if (!telegramRegex.test(cleanUsername)) {
          return NextResponse.json({
            error: 'Некорректный формат Telegram username'
          }, { status: 400 })
        }
        updateData.telegram_username = cleanUsername
      } else {
        updateData.telegram_username = null
      }
    }

    if (usdt_wallet !== undefined) {
      const cleanWallet = usdt_wallet?.trim() || null
      if (cleanWallet) {
        // Валидация USDT кошелька (только BEP20)
        const bep20Regex = /^0x[a-fA-F0-9]{40}$/
        if (!bep20Regex.test(cleanWallet)) {
          return NextResponse.json({
            error: 'Некорректный адрес USDT кошелька. Поддерживается только BEP20 формат (0x...)'
          }, { status: 400 })
        }
        updateData.usdt_wallet = cleanWallet
      } else {
        updateData.usdt_wallet = null
      }
    }

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null
    }

    console.log('Update data prepared:', updateData)

    // Сначала проверим, существует ли пользователь
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, auth_id, email, first_name, last_name')
      .eq('auth_id', user.id)
      .single()

    console.log('Existing user check:', { existingUser, findError })

    if (findError || !existingUser) {
      console.error('User not found in database:', findError)
      return NextResponse.json({
        error: 'User not found in system. Please contact administrator.',
        details: findError
      }, { status: 404 })
    }

    // Обновляем данные пользователя
    const finalUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    console.log('Final update data:', finalUpdateData)

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(finalUpdateData)
      .eq('auth_id', user.id)
      .select()
      .single()

    console.log('Update result:', { updatedUser, updateError })

    if (updateError) {
      console.error('Error updating user data:', updateError)
      return NextResponse.json({
        error: 'Failed to update user data',
        details: updateError
      }, { status: 500 })
    }

    console.log('User updated successfully:', updatedUser)
    return NextResponse.json(updatedUser)

  } catch (error) {
    console.error('Update user data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
