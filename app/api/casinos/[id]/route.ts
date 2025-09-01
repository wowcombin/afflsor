import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить конкретное казино
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем казино с информацией о последнем тесте
    const { data: casino, error } = await supabase
      .from('casinos_with_latest_test')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !casino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    return NextResponse.json({ casino })

  } catch (error) {
    console.error('Get casino error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Обновить казино
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
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

    if (!userData || !['tester', 'manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только Tester, Manager и Admin могут обновлять казино' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      url,
      promo,
      company,
      currency,
      status,
      allowed_bins,
      auto_approve_limit,
      withdrawal_time_value,
      withdrawal_time_unit,
      notes
    } = body

    // Проверяем что казино существует
    const { data: existingCasino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name')
      .eq('id', id)
      .single()

    if (casinoError || !existingCasino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    // Валидация
    if (name && !name.trim()) {
      return NextResponse.json({ error: 'Название казино не может быть пустым' }, { status: 400 })
    }

    if (url) {
      try {
        new URL(url)
      } catch {
        return NextResponse.json({ error: 'Некорректный URL' }, { status: 400 })
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (url !== undefined) updateData.url = url
    if (promo !== undefined) updateData.promo = promo
    if (company !== undefined) updateData.company = company
    if (currency !== undefined) updateData.currency = currency
    if (status !== undefined) updateData.status = status
    if (allowed_bins !== undefined) updateData.allowed_bins = allowed_bins
    if (auto_approve_limit !== undefined) updateData.auto_approve_limit = auto_approve_limit
    if (withdrawal_time_value !== undefined) updateData.withdrawal_time_value = withdrawal_time_value
    if (withdrawal_time_unit !== undefined) updateData.withdrawal_time_unit = withdrawal_time_unit
    if (notes !== undefined) updateData.notes = notes

    // Обновляем казино
    const { data: updatedCasino, error } = await supabase
      .from('casinos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update casino error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем обновление казино
    await supabase.rpc('log_action', {
      p_user_id: userData.id,
      p_action: 'UPDATE',
      p_entity_type: 'casino',
      p_entity_id: id,
      p_details: `Обновлено казино "${existingCasino.name}"`
    })

    return NextResponse.json({
      success: true,
      casino: updatedCasino,
      message: `Казино ${existingCasino.name} обновлено`
    })

  } catch (error) {
    console.error('Update casino error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить казино (только для admin)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
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

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - только Admin может удалять казино' }, { status: 403 })
    }

    // Проверяем что казино существует
    const { data: existingCasino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name')
      .eq('id', id)
      .single()

    if (casinoError || !existingCasino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    // Удаляем казино (связанные тесты и мануалы удалятся каскадно)
    const { error } = await supabase
      .from('casinos')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем удаление казино
    await supabase.rpc('log_action', {
      p_user_id: userData.id,
      p_action: 'DELETE',
      p_entity_type: 'casino',
      p_entity_id: id,
      p_details: `Удалено казино "${existingCasino.name}"`
    })

    return NextResponse.json({
      success: true,
      message: `Казино ${existingCasino.name} удалено`
    })

  } catch (error) {
    console.error('Delete casino error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
