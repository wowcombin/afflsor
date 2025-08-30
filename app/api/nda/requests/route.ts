import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// GET - Получить все NDA запросы
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка роли HR/Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем все NDA токены с пользователями
    const { data: ndaRequests, error } = await supabase
      .from('nda_tokens')
      .select(`
        id,
        token,
        expires_at,
        created_at,
        is_used,
        is_revoked,
        users!nda_tokens_user_id_fkey(
          id,
          email,
          first_name,
          last_name,
          role,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedRequests = (ndaRequests || []).map(request => {
      const user_info = Array.isArray(request.users) ? request.users[0] : request.users
      
      let status = 'pending'
      if (request.is_used) {
        status = 'signed'
      } else if (request.is_revoked) {
        status = 'revoked'
      } else if (new Date(request.expires_at) <= new Date()) {
        status = 'expired'
      }

      return {
        id: request.id,
        token: request.token,
        expires_at: request.expires_at,
        created_at: request.created_at,
        status,
        user: {
          id: user_info?.id || null,
          email: user_info?.email || '',
          first_name: user_info?.first_name || '',
          last_name: user_info?.last_name || '',
          role: user_info?.role || '',
          status: user_info?.status || ''
        }
      }
    })

    return NextResponse.json({ requests: formattedRequests })

  } catch (error) {
    console.error('Get NDA requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый NDA запрос
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка роли HR/Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id обязателен' }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Проверяем, нет ли уже активного NDA запроса
    const { data: existingRequest } = await supabase
      .from('nda_tokens')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_used', false)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingRequest) {
      return NextResponse.json({ error: 'У пользователя уже есть активный NDA запрос' }, { status: 400 })
    }

    // Получаем активный шаблон NDA
    const { data: template } = await supabase
      .from('nda_templates')
      .select('id')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Активный шаблон NDA не найден' }, { status: 500 })
    }

    // Генерируем токен и создаем запрос
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 дней

    const { data: newRequest, error: createError } = await supabase
      .from('nda_tokens')
      .insert({
        token,
        user_id,
        template_id: template.id,
        expires_at: expiresAt.toISOString(),
        created_by: userData.id
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Формируем ссылку
    const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/nda/${token}`

    return NextResponse.json({
      success: true,
      request: newRequest,
      link,
      user: {
        name: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.email,
        email: targetUser.email
      }
    })

  } catch (error) {
    console.error('Create NDA request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
