import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// DELETE - Удалить шаблон NDA
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (HR, Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const templateId = params.id

    // Проверяем, используется ли шаблон в соглашениях
    const { data: agreements, error: checkError } = await supabase
      .from('nda_agreements')
      .select('id')
      .eq('template_id', templateId)
      .limit(1)

    if (checkError) {
      console.error('Check agreements error:', checkError)
      return NextResponse.json({ 
        error: 'Ошибка проверки использования шаблона' 
      }, { status: 500 })
    }

    if (agreements && agreements.length > 0) {
      return NextResponse.json({ 
        error: 'Нельзя удалить шаблон, который используется в соглашениях' 
      }, { status: 400 })
    }

    // Удаляем шаблон (мягкое удаление - деактивация)
    const { error: deleteError } = await supabase
      .from('nda_templates')
      .update({ is_active: false })
      .eq('id', templateId)

    if (deleteError) {
      console.error('Template delete error:', deleteError)
      return NextResponse.json({ 
        error: 'Ошибка удаления шаблона' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Шаблон успешно удален' 
    })

  } catch (error) {
    console.error('NDA template delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Обновить шаблон NDA
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (HR, Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const templateId = params.id
    const body = await request.json()
    const { name, description, content, is_active } = body

    if (!name || !content) {
      return NextResponse.json({ 
        error: 'Название и содержание обязательны' 
      }, { status: 400 })
    }

    // Обновляем шаблон
    const { data: template, error } = await supabase
      .from('nda_templates')
      .update({
        name,
        description,
        content,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Template update error:', error)
      return NextResponse.json({ 
        error: 'Ошибка обновления шаблона' 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: template })

  } catch (error) {
    console.error('NDA template update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
