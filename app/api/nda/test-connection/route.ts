import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST CONNECTION API ===')
    
    // Тестируем подключение с service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Тестируем простой запрос к nda_agreements
    const { data: agreements, error: agreementsError } = await supabase
      .from('nda_agreements')
      .select('id, full_name, email, status, access_token')
      .limit(5)
    
    console.log('Agreements query result:', { agreements, agreementsError })
    
    // Тестируем запрос к nda_templates
    const { data: templates, error: templatesError } = await supabase
      .from('nda_templates')
      .select('id, name, is_active')
      .limit(5)
    
    console.log('Templates query result:', { templates, templatesError })
    
    return NextResponse.json({
      success: true,
      data: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        agreements: agreements || [],
        agreementsError: agreementsError?.message,
        templates: templates || [],
        templatesError: templatesError?.message
      }
    })
    
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json({ 
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
