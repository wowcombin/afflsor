import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Проверяем шаблоны
    const { data: templates, error: templatesError } = await supabase
      .from('nda_templates')
      .select('*')

    console.log('Templates:', templates, 'Error:', templatesError)

    // Проверяем соглашения
    const { data: agreements, error: agreementsError } = await supabase
      .from('nda_agreements')
      .select(`
        *,
        nda_templates (
          id,
          name,
          content
        )
      `)

    console.log('Agreements:', agreements, 'Error:', agreementsError)

    return NextResponse.json({
      success: true,
      data: {
        templates: {
          count: templates?.length || 0,
          data: templates,
          error: templatesError
        },
        agreements: {
          count: agreements?.length || 0,
          data: agreements,
          error: agreementsError
        }
      }
    })

  } catch (error) {
    console.error('NDA Test API Error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
