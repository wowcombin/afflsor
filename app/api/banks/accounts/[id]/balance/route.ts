import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { balance, comment } = await request.json()
  
  // Проверка роли (только cfo, manager, hr)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user?.id)
    .single()
  
  if (!userData || !['cfo', 'manager', 'hr'].includes(userData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Валидация баланса
  if (balance < 0) {
    return NextResponse.json({ error: 'Баланс не может быть отрицательным' }, { status: 400 })
  }
  
  // Получаем старый баланс для логирования
  const { data: oldAccount } = await supabase
    .from('bank_accounts')
    .select('balance')
    .eq('id', params.id)
    .single()
  
  // Обновляем баланс
  const { error } = await supabase
    .from('bank_accounts')
    .update({
      balance,
      balance_updated_at: new Date().toISOString(),
      balance_updated_by: userData.id
    })
    .eq('id', params.id)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Логируем изменение
  await supabase.from('audit_log').insert({
    user_id: userData.id,
    action: 'UPDATE_BANK_BALANCE',
    table_name: 'bank_accounts',
    record_id: params.id,
    old_values: { balance: oldAccount?.balance },
    new_values: { balance, comment }
  })
  
  return NextResponse.json({ 
    success: true,
    message: balance < 10 
      ? 'Внимание: карты этого банка скрыты (баланс < $10)' 
      : 'Баланс обновлен'
  })
}
