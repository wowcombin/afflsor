import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    const agreementId = params.id

    console.log('NDA Check API called:', { agreementId, token })

    // Проверяем существует ли соглашение
    const { data: agreement, error: agreementError } = await supabase
      .from('nda_agreements')
      .select('*')
      .eq('id', agreementId)
      .single()

    console.log('Agreement found:', { agreement, agreementError })

    // Проверяем шаблоны
    const { data: templates, error: templatesError } = await supabase
      .from('nda_templates')
      .select('*')

    console.log('Templates found:', { templates, templatesError })

    return NextResponse.json({
      success: true,
      data: {
        agreement_exists: !!agreement,
        agreement_data: agreement,
        agreement_error: agreementError,
        templates_count: templates?.length || 0,
        templates_data: templates,
        templates_error: templatesError,
        token_match: agreement?.access_token === token,
        provided_token: token,
        stored_token: agreement?.access_token
      }
    })

  } catch (error) {
    console.error('NDA Check API Error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
