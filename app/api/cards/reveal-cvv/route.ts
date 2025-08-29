import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Временное хранение CVV в памяти (в production лучше использовать Redis)
const cvvCache = new Map<string, { cvv: string, expires: number }>()

// Очистка истекших CVV каждую минуту
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cvvCache.entries()) {
    if (value.expires < now) {
      cvvCache.delete(key)
    }
  }
}, 60000)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'junior') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Валидация данных
    const { card_id, pin } = body

    if (!card_id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 })
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN должен содержать 4 цифры' }, { status: 400 })
    }

    // Проверяем PIN (в production должен быть из настроек системы)
    const SYSTEM_PIN = '1234' // TODO: Получать из системных настроек
    
    if (pin !== SYSTEM_PIN) {
      // Логируем неудачную попытку
      try {
        await supabase
          .from('cvv_access_log')
          .insert({
            user_id: userData.id,
            card_id,
            success: false,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            attempted_at: new Date().toISOString()
          })
      } catch (logError) {
        console.log('CVV log failed:', logError)
      }

      return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 })
    }

    // Проверяем, что карта назначена этому Junior
    const { data: assignment } = await supabase
      .from('card_assignments')
      .select('id')
      .eq('card_id', card_id)
      .eq('junior_id', userData.id)
      .eq('status', 'assigned')
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Карта не назначена вам' }, { status: 403 })
    }

    // Получаем зашифрованный CVV
    const { data: cardSecret, error: secretError } = await supabase
      .from('card_secrets')
      .select('cvv_enc')
      .eq('card_id', card_id)
      .single()

    if (secretError || !cardSecret) {
      return NextResponse.json({ error: 'CVV не найден' }, { status: 404 })
    }

    // Расшифровываем CVV (здесь должна быть реальная расшифровка)
    // В production использовать crypto.decrypt(cardSecret.cvv_enc)
    const decryptedCvv = '123' // Заглушка - в реальности расшифровка

    // Сохраняем в кеш на 30 секунд
    const cacheKey = `${userData.id}_${card_id}`
    cvvCache.set(cacheKey, {
      cvv: decryptedCvv,
      expires: Date.now() + 30000 // 30 секунд
    })

    // Логируем успешный доступ
    try {
      await supabase
        .from('cvv_access_log')
        .insert({
          user_id: userData.id,
          card_id,
          success: true,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          accessed_at: new Date().toISOString()
        })
    } catch (logError) {
      console.log('CVV log failed:', logError)
    }

    return NextResponse.json({
      success: true,
      cvv: decryptedCvv,
      expires_in: 30,
      message: 'CVV отображается 30 секунд'
    })

  } catch (error) {
    console.error('CVV reveal API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
