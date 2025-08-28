import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Выход из системы
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Вы успешно вышли из системы' 
    })
  } catch (error) {
    console.error('Ошибка выхода:', error)
    return NextResponse.json({ 
      error: 'Ошибка выхода из системы' 
    }, { status: 500 })
  }
}
