import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все NDA соглашения
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (HR, Admin, CEO)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin', 'ceo'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('nda_agreements')
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          role
        ),
        nda_templates:template_id (
          name,
          version
        ),
        nda_files (
          file_type,
          file_path,
          original_filename
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: agreements, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: agreements })

  } catch (error) {
    console.error('NDA agreements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить NDA соглашение (только неподписанные)
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const agreementId = searchParams.get('id')

    if (!agreementId) {
      return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 })
    }

    // Проверяем, что NDA не подписан
    const { data: agreement, error: checkError } = await supabase
      .from('nda_agreements')
      .select('status')
      .eq('id', agreementId)
      .single()

    if (checkError || !agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    if (agreement.status === 'signed') {
      return NextResponse.json({ 
        error: 'Нельзя удалить подписанное NDA соглашение' 
      }, { status: 400 })
    }

    // Удаляем соглашение
    const { error: deleteError } = await supabase
      .from('nda_agreements')
      .delete()
      .eq('id', agreementId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'NDA соглашение успешно удалено' 
    })

  } catch (error) {
    console.error('NDA delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
