import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { casino_id, card_id, deposit_amount, casino_username, casino_password } = await request.json()
  
  // Проверка баланса банка карты
  const { data: card } = await supabase
    .from('cards')
    .select('bank_account_id, bank_accounts!inner(balance)')
    .eq('id', card_id)
    .single()
  
  if (!card || card.bank_accounts.balance < 10) {
    return NextResponse.json({ 
      error: 'Карта недоступна. Баланс банка ниже минимума $10' 
    }, { status: 400 })
  }
  
  // Создание депозита
  const { data: work, error } = await supabase
    .from('works')
    .insert({
      junior_id: (await supabase.auth.getUser()).data.user?.id,
      casino_id,
      card_id,
      deposit_amount,
      casino_username,
      casino_password
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ work })
}
