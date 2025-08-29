import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const token = params.token
    
    // Проверяем, что токен существует
    const { data: tokenData, error: tokenError } = await supabase
      .from('nda_tokens')
      .select('id, is_used, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    // Логируем просмотр только если токен еще активен
    if (!tokenData.is_used && new Date(tokenData.expires_at) > new Date()) {
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      await supabase
        .from('nda_view_logs')
        .insert({
          token_id: tokenData.id,
          ip_address: ipAddress,
          user_agent: userAgent
        })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('NDA view logging error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
