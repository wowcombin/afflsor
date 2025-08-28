import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const casinoId = searchParams.get('casino_id')
  
  // Получаем текущего пользователя
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // КРИТИЧНО: Используем view с проверкой баланса >= 10
  const { data: cards, error } = await supabase
    .from('available_cards_for_junior')
    .select('*')
    .eq('junior_id', user.id)
    .eq('casino_id', casinoId)
    .eq('is_available', true) // Только карты с балансом >= $10
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ cards })
}
