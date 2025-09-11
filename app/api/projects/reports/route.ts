import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить агрегированные отчеты по проектам для C-Level
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли C-Level
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['ceo', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только C-Level могут просматривать агрегированные отчеты'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current' // current, quarter, year
    const departmentFilter = searchParams.get('department') // development, marketing, hr, etc.

    // Получаем все проекты с задачами
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name,
          role
        ),
        tasks (
          id,
          title,
          task_status,
          priority,
          due_date,
          created_at,
          completed_at,
          estimated_hours,
          actual_hours,
          assignee:assignee_id (
            id,
            email,
            role
          )
        )
      `)

    if (projectsError) {
      console.error('Projects fetch error:', projectsError)
      return NextResponse.json({ 
        error: 'Ошибка получения проектов',
        details: projectsError.message
      }, { status: 500 })
    }

    // Фильтрация по департаменту
    const filteredProjects = departmentFilter 
      ? projects?.filter(p => p.project_type === departmentFilter)
      : projects

    // Агрегированная статистика
    const now = new Date()
    const totalProjects = filteredProjects?.length || 0
    const activeProjects = filteredProjects?.filter(p => p.status === 'active').length || 0
    const completedProjects = filteredProjects?.filter(p => p.status === 'completed').length || 0
    
    // Статистика по задачам
    const allTasks = filteredProjects?.flatMap(p => p.tasks || []) || []
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter((t: any) => t.task_status === 'done').length
    const inProgressTasks = allTasks.filter((t: any) => t.task_status === 'in_progress').length
    const overdueTasks = allTasks.filter((t: any) => 
      t.due_date && new Date(t.due_date) < now && t.task_status !== 'done'
    ).length

    // Статистика по департаментам
    const departmentStats = filteredProjects?.reduce((acc, project) => {
      const dept = project.project_type || 'other'
      if (!acc[dept]) {
        acc[dept] = {
          projects_count: 0,
          tasks_count: 0,
          completed_tasks: 0,
          total_budget: 0,
          spent_budget: 0,
          avg_progress: 0,
          overdue_tasks: 0
        }
      }
      
      const tasks = project.tasks || []
      acc[dept].projects_count++
      acc[dept].tasks_count += tasks.length
      acc[dept].completed_tasks += tasks.filter((t: any) => t.task_status === 'done').length
      acc[dept].total_budget += project.budget || 0
      acc[dept].spent_budget += project.spent_amount || 0
      acc[dept].avg_progress += project.progress_percentage || 0
      acc[dept].overdue_tasks += tasks.filter((t: any) => 
        t.due_date && new Date(t.due_date) < now && t.task_status !== 'done'
      ).length
      
      return acc
    }, {} as Record<string, any>) || {}

    // Рассчитываем средний прогресс по департаментам
    Object.keys(departmentStats).forEach(dept => {
      const deptData = departmentStats[dept]
      deptData.avg_progress = deptData.projects_count > 0 
        ? deptData.avg_progress / deptData.projects_count 
        : 0
      deptData.completion_rate = deptData.tasks_count > 0
        ? (deptData.completed_tasks / deptData.tasks_count) * 100
        : 0
      deptData.budget_utilization = deptData.total_budget > 0
        ? (deptData.spent_budget / deptData.total_budget) * 100
        : 0
    })

    // Проекты с задержками
    const delayedProjects = filteredProjects?.filter(p => {
      if (!p.deadline || p.status === 'completed') return false
      return new Date(p.deadline) < now
    }).map(p => ({
      id: p.id,
      title: p.title,
      owner: p.owner,
      deadline: p.deadline,
      progress: p.progress_percentage,
      days_overdue: Math.ceil((now.getTime() - new Date(p.deadline).getTime()) / (1000 * 60 * 60 * 24)),
      overdue_tasks: (p.tasks || []).filter((t: any) => 
        t.due_date && new Date(t.due_date) < now && t.task_status !== 'done'
      ).length
    })) || []

    // Топ исполнители
    const assigneeStats = allTasks.reduce((acc: any, task: any) => {
      if (!task.assignee?.id) return acc
      
      const assigneeId = task.assignee.id
      if (!acc[assigneeId]) {
        acc[assigneeId] = {
          assignee: task.assignee,
          total_tasks: 0,
          completed_tasks: 0,
          overdue_tasks: 0,
          total_estimated_hours: 0,
          total_actual_hours: 0
        }
      }
      
      acc[assigneeId].total_tasks++
      if (task.task_status === 'done') acc[assigneeId].completed_tasks++
      if (task.due_date && new Date(task.due_date) < now && task.task_status !== 'done') {
        acc[assigneeId].overdue_tasks++
      }
      acc[assigneeId].total_estimated_hours += task.estimated_hours || 0
      acc[assigneeId].total_actual_hours += task.actual_hours || 0
      
      return acc
    }, {} as Record<string, any>)

    // Преобразуем в массив и сортируем
    const topPerformers = Object.values(assigneeStats)
      .map((stats: any) => ({
        ...stats,
        completion_rate: stats.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks) * 100 : 0,
        efficiency: stats.total_estimated_hours > 0 ? 
          (stats.total_estimated_hours / Math.max(stats.total_actual_hours, 0.1)) * 100 : 100
      }))
      .sort((a: any, b: any) => b.completion_rate - a.completion_rate)
      .slice(0, 10)

    // Тренды и прогнозы
    const trends = {
      completion_trend: calculateCompletionTrend(allTasks),
      budget_trend: calculateBudgetTrend(filteredProjects || []),
      delay_trend: calculateDelayTrend(delayedProjects)
    }

    console.log(`C-Level report generated for ${userData.email}: ${totalProjects} projects, ${totalTasks} tasks`)

    return NextResponse.json({
      success: true,
      period,
      department: departmentFilter || 'all',
      summary: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          completion_rate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
          delayed: delayedProjects.length
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          in_progress: inProgressTasks,
          overdue: overdueTasks,
          completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        },
        budget: {
          total: Object.values(departmentStats).reduce((sum, dept: any) => sum + dept.total_budget, 0),
          spent: Object.values(departmentStats).reduce((sum, dept: any) => sum + dept.spent_budget, 0),
          utilization: (Object.values(departmentStats) as any[]).reduce((sum, dept: any) => sum + dept.budget_utilization, 0) / Math.max(Object.keys(departmentStats).length, 1)
        }
      },
      departments: departmentStats,
      delayed_projects: delayedProjects,
      top_performers: topPerformers,
      trends,
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Project reports API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// Функция расчета тренда завершения задач
function calculateCompletionTrend(tasks: any[]) {
  const last30Days = tasks.filter(t => {
    const createdDate = new Date(t.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return createdDate >= thirtyDaysAgo
  })

  const last7Days = tasks.filter(t => {
    const createdDate = new Date(t.created_at)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return createdDate >= sevenDaysAgo
  })

  const monthlyRate = last30Days.length > 0 ? 
    (last30Days.filter(t => t.task_status === 'done').length / last30Days.length) * 100 : 0
  const weeklyRate = last7Days.length > 0 ? 
    (last7Days.filter(t => t.task_status === 'done').length / last7Days.length) * 100 : 0

  return {
    monthly_completion_rate: monthlyRate,
    weekly_completion_rate: weeklyRate,
    trend: weeklyRate > monthlyRate ? 'improving' : weeklyRate < monthlyRate ? 'declining' : 'stable'
  }
}

// Функция расчета тренда бюджета
function calculateBudgetTrend(projects: any[]) {
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent_amount || 0), 0)
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  return {
    total_budget: totalBudget,
    total_spent: totalSpent,
    utilization_rate: utilization,
    status: utilization > 90 ? 'critical' : utilization > 70 ? 'warning' : 'good'
  }
}

// Функция расчета тренда задержек
function calculateDelayTrend(delayedProjects: any[]) {
  const totalDelays = delayedProjects.length
  const avgDelayDays = totalDelays > 0 ? 
    delayedProjects.reduce((sum, p) => sum + p.days_overdue, 0) / totalDelays : 0

  return {
    total_delayed: totalDelays,
    avg_delay_days: avgDelayDays,
    severity: avgDelayDays > 30 ? 'critical' : avgDelayDays > 14 ? 'high' : avgDelayDays > 7 ? 'medium' : 'low'
  }
}
