import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Force Vercel rebuild - API bins with userData.id fix

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const casinoId = params.id
    
    // Проверка роли (только tester может устанавливать БИНы)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Валидация данных
    const { bins } = body

    if (!Array.isArray(bins)) {
      return NextResponse.json({ error: 'Bins must be an array' }, { status: 400 })
    }

    // Валидация каждого БИНа
    for (const bin of bins) {
      if (typeof bin !== 'string' || !/^\d{6}$/.test(bin)) {
        return NextResponse.json({ 
          error: `Invalid BIN format: ${bin}. Must be exactly 6 digits` 
        }, { status: 400 })
      }
    }

    // Проверка на дубликаты
    const uniqueBins = [...new Set(bins)]
    if (uniqueBins.length !== bins.length) {
      return NextResponse.json({ error: 'Duplicate BINs found' }, { status: 400 })
    }

    // Проверяем, что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, status, allowed_bins')
      .eq('id', casinoId)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Casino not found' }, { status: 404 })
    }

    // Обновляем БИНы казино
    const { data: updatedCasino, error: updateError } = await supabase
      .from('casinos')
      .update({ 
        allowed_bins: uniqueBins,
        updated_at: new Date().toISOString()
      })
      .eq('id', casinoId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Если казино было в статусе 'checking', переводим в 'testing'
    if (casino.status === 'checking') {
      await supabase
        .from('casinos')
        .update({ status: 'testing' })
        .eq('id', casinoId)
    }

    // Логируем изменение БИНов
    await supabase
      .from('casino_bin_history')
      .insert({
        casino_id: casinoId,
        old_bins: casino.allowed_bins || [],
        new_bins: uniqueBins,
        changed_by: userData.id,
        changed_at: new Date().toISOString(),
        reason: 'Tester установил БИНы после тестирования'
      })
      .catch(err => console.log('History logging failed:', err)) // Не критично если история не записалась

    return NextResponse.json({
      success: true,
      message: `БИНы успешно обновлены для казино ${casino.name}`,
      casino: updatedCasino,
      bins: uniqueBins,
      binsCount: uniqueBins.length
    })

  } catch (error) {
    console.error('BIN management API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}

// GET для получения текущих БИНов
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const casinoId = params.id
    
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

    if (!userData || !['tester', 'manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем казино с БИНами
    const { data: casino, error } = await supabase
      .from('casinos')
      .select('id, name, allowed_bins, status')
      .eq('id', casinoId)
      .single()

    if (error || !casino) {
      return NextResponse.json({ error: 'Casino not found' }, { status: 404 })
    }

    return NextResponse.json({
      casino,
      bins: casino.allowed_bins || [],
      binsCount: casino.allowed_bins?.length || 0
    })

  } catch (error) {
    console.error('Get casino bins API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
