import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Analytics API called at:', new Date().toISOString())
    
    // Простые статичные данные для проверки
    const analyticsData = {
      totalJuniors: 1,
      activeJuniors: 1,
      totalWithdrawals: 3,
      pendingWithdrawals: 1,
      approvedWithdrawals: 2,
      rejectedWithdrawals: 0,
      totalProfit: 290.0,
      todayProfit: 50.0,
      weekProfit: 150.0,
      monthProfit: 290.0,
      avgProcessingTime: 2.5,
      overdueWithdrawals: 0,
      topPerformers: [
        {
          id: '1',
          name: 'Дмитрий К',
          telegram: '@opporenno',
          profit: 290.0,
          withdrawals: 3,
          successRate: 85.5
        }
      ],
      casinoStats: [
        {
          name: 'Virgin Games',
          totalDeposits: 200.0,
          totalWithdrawals: 300.0,
          profit: 100.0,
          successRate: 87.3
        },
        {
          name: 'Lottomart',
          totalDeposits: 150.0,
          totalWithdrawals: 200.0,
          profit: 50.0,
          successRate: 82.1
        }
      ],
      dailyStats: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deposits: Math.floor(Math.random() * 100) + 50,
        withdrawals: Math.floor(Math.random() * 150) + 80,
        profit: Math.floor(Math.random() * 50) + 20
      })).reverse()
    }

    console.log('Returning analytics data successfully')
    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Analytics API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}