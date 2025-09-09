import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем всех пользователей с информацией о Team Lead
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        team_lead:team_lead_id (
          id,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Организуем структуру
    const structure = {
      ceo: null as any,
      coordinators: [] as any[],
      hr: [] as any[],
      cfo: [] as any[],
      teamLeads: [] as any[],
      manualQA: [] as any[],
      qaAssistants: [] as any[],
      unassignedJuniors: [] as any[]
    }

    // Создаем карту Team Lead -> Juniors
    const teamLeadMap = new Map()

    users.forEach(user => {
      switch (user.role) {
        case 'ceo':
          structure.ceo = user
          break
        case 'manager':
          structure.coordinators.push(user)
          break
        case 'hr':
          structure.hr.push(user)
          break
        case 'cfo':
          structure.cfo.push(user)
          break
        case 'teamlead':
          if (!teamLeadMap.has(user.id)) {
            teamLeadMap.set(user.id, {
              teamLead: user,
              juniors: []
            })
          }
          break
        case 'tester':
          structure.manualQA.push(user)
          break
        case 'qa_assistant':
          structure.qaAssistants.push(user)
          break
        case 'junior':
          if (user.team_lead_id) {
            // Если у Junior есть Team Lead
            if (!teamLeadMap.has(user.team_lead_id)) {
              // Если Team Lead еще не в карте, создаем запись
              const teamLead = users.find(u => u.id === user.team_lead_id)
              if (teamLead) {
                teamLeadMap.set(user.team_lead_id, {
                  teamLead: teamLead,
                  juniors: []
                })
              }
            }
            
            const teamData = teamLeadMap.get(user.team_lead_id)
            if (teamData) {
              teamData.juniors.push(user)
            }
          } else {
            // Junior без Team Lead
            structure.unassignedJuniors.push(user)
          }
          break
      }
    })

    // Преобразуем карту Team Lead в массив
    structure.teamLeads = Array.from(teamLeadMap.values())

    console.log('Organization structure loaded:', {
      ceo: !!structure.ceo,
      coordinators: structure.coordinators.length,
      hr: structure.hr.length,
      cfo: structure.cfo.length,
      teamLeads: structure.teamLeads.length,
      manualQA: structure.manualQA.length,
      qaAssistants: structure.qaAssistants.length,
      unassignedJuniors: structure.unassignedJuniors.length
    })

    return NextResponse.json(structure)

  } catch (error) {
    console.error('HR structure API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
