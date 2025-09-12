import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить тестовую работу (рейтинг, статус и т.д.)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id: workId } = params
    
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

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden - только Tester может обновлять работы' }, { status: 403 })
    }

    const body = await request.json()
    const { rating, status, withdrawal_time } = body

    console.log('📝 Updating test work:', {
      workId,
      updates: { rating, status, withdrawal_time },
      userRole: userData.role
    })

    // Проверяем что работа существует и принадлежит тестеру
    const { data: work, error: workError } = await supabase
      .from('casino_tests')
      .select('id, tester_id')
      .eq('id', workId)
      .eq('tester_id', userData.id)
      .single()

    if (workError || !work) {
      console.error('❌ Work not found:', { workId, workError })
      return NextResponse.json({ error: 'Тестовая работа не найдена' }, { status: 404 })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    if (rating !== undefined) updateData.rating = rating
    if (status !== undefined) updateData.status = status
    if (withdrawal_time !== undefined) updateData.withdrawal_time = withdrawal_time
    updateData.updated_at = new Date().toISOString()

    // Обновляем работу
    const { data: updatedWork, error: updateError } = await supabase
      .from('casino_tests')
      .update(updateData)
      .eq('id', workId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('✅ Test work updated successfully:', { workId, updateData })

    return NextResponse.json({
      success: true,
      work: updatedWork,
      message: 'Тестовая работа обновлена'
    })

  } catch (error) {
    console.error('Update test work error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить тестовую работу
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id: workId } = params
    
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

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden - только Tester может удалять работы' }, { status: 403 })
    }

    console.log('🗑️ Deleting test work:', {
      workId,
      userRole: userData.role
    })

    // Проверяем что работа существует и принадлежит тестеру
    const { data: work, error: workError } = await supabase
      .from('casino_tests')
      .select('id, tester_id, status')
      .eq('id', workId)
      .eq('tester_id', userData.id)
      .single()

    if (workError || !work) {
      console.error('❌ Work not found:', { workId, workError })
      return NextResponse.json({ error: 'Тестовая работа не найдена' }, { status: 404 })
    }

    // Удаляем работу
    const { error: deleteError } = await supabase
      .from('casino_tests')
      .delete()
      .eq('id', workId)

    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log('✅ Test work deleted successfully:', { workId })

    return NextResponse.json({
      success: true,
      message: 'Тестовая работа удалена'
    })

  } catch (error) {
    console.error('Delete test work error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
