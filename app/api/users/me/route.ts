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
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(userData)

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, surname, telegram_username, usdt_wallet, phone } = body

    // Валидация данных
    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name?.trim() || null
    }
    
    if (surname !== undefined) {
      updateData.surname = surname?.trim() || null
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
        // Валидация USDT кошелька (TRC20/ERC20)
        const trc20Regex = /^T[A-Za-z1-9]{33}$/
        const erc20Regex = /^0x[a-fA-F0-9]{40}$/
        if (!trc20Regex.test(cleanWallet) && !erc20Regex.test(cleanWallet)) {
          return NextResponse.json({ 
            error: 'Некорректный адрес USDT кошелька' 
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

    // Обновляем данные пользователя
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user data:', updateError)
      return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 })
    }

    return NextResponse.json(updatedUser)

  } catch (error) {
    console.error('Update user data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
