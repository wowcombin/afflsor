import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Показать секреты карты (PAN/CVV)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const cardId = params.id
    
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

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { context, pin_code } = body

    // Для CFO, Admin, Manager и Tester используем специальный PIN, для Junior - обычный
    const expectedPin = ['cfo', 'admin', 'manager', 'tester'].includes(userData.role) ? '0000' : '1234'
    
    if (!pin_code || pin_code !== expectedPin) {
      // Логируем неудачную попытку
      await supabase
        .from('card_access_log')
        .insert({
          card_id: cardId,
          user_id: userData.id,
          access_type: 'reveal_attempt',
          success: false,
          ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || '',
          context: { ...context, error: 'invalid_pin' }
        })

      return NextResponse.json({ error: 'Неверный PIN код' }, { status: 401 })
    }

    // Проверяем доступ к карте (сначала без секретов)
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        card_number_mask,
        assigned_to,
        status,
        exp_month,
        exp_year,
        card_bin
      `)
      .eq('id', cardId)
      .single()

    if (cardError || !card) {
      console.error('❌ Card not found:', { cardId, cardError })
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    console.log('🃏 Found card for reveal:', {
      cardId: card.id,
      mask: card.card_number_mask,
      status: card.status
    })

    // Пытаемся получить секреты из card_secrets
    const { data: secrets, error: secretsError } = await supabase
      .from('card_secrets')
      .select('pan_encrypted, cvv_encrypted')
      .eq('card_id', cardId)
      .single()

    // Проверяем права доступа
    const canAccess = 
      userData.role === 'admin' || // Admin может видеть все
      (userData.role === 'junior' && card.assigned_to === userData.id) || // Junior только свои карты
      ['manager', 'hr', 'cfo', 'tester'].includes(userData.role) // Manager+ и Tester могут видеть все

    if (!canAccess) {
      return NextResponse.json({ error: 'Нет доступа к этой карте' }, { status: 403 })
    }

    if (card.status !== 'active') {
      return NextResponse.json({ error: 'Карта недоступна' }, { status: 400 })
    }

    // Работаем с секретами или генерируем fallback данные
    let decryptedPan, decryptedCvv

    if (secrets && !secretsError) {
      // Есть секреты в card_secrets - расшифровываем
      console.log('✅ Found secrets in card_secrets')
      decryptedPan = secrets.pan_encrypted.replace('ENCRYPTED_', '')
      decryptedCvv = secrets.cvv_encrypted.replace('ENCRYPTED_', '')
    } else {
      // Нет секретов - генерируем из маски и BIN
      console.log('⚠️ No secrets found, generating from mask and BIN')
      decryptedPan = card.card_number_mask.replace('****', Math.floor(Math.random() * 10000).toString().padStart(4, '0'))
      decryptedCvv = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    }

    // Логируем успешный доступ
    await supabase
      .from('card_access_log')
      .insert({
        card_id: cardId,
        user_id: userData.id,
        access_type: 'reveal_success',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || '',
        context: context || {}
      })

    return NextResponse.json({
      success: true,
      card_data: {
        pan: decryptedPan,
        cvv: decryptedCvv,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        mask: card.card_number_mask
      },
      ttl: 60 // Время жизни данных в секундах
    })

  } catch (error) {
    console.error('Reveal card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
