import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Кеш для курсов валют (обновляется каждый час)
let cachedRates: any = null
let lastUpdate: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 час в миллисекундах

// Функция для получения курсов валют с внешнего API
async function fetchExchangeRates() {
  try {
    // Используем бесплатный API exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Afflsor ERP/1.0)'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }

    const data = await response.json()

    // Конвертируем в наш формат (к USD) и применяем коэффициент 0.95
    // data.rates содержит курсы FROM USD (например USD->GBP = 0.78)
    // Нам нужны курсы TO USD (например GBP->USD = 1/0.78 = 1.28)
    const rates = {
      'USD': 0.95,  // USD тоже -5% для брутто
      'EUR': (1 / data.rates.EUR) * 0.95,  // Инвертируем: EUR->USD и применяем 0.95
      'GBP': (1 / data.rates.GBP) * 0.95,  // Инвертируем: GBP->USD и применяем 0.95
      'CAD': (1 / data.rates.CAD) * 0.95   // Инвертируем: CAD->USD и применяем 0.95
    }

    return {
      rates,
      source: 'exchangerate-api.com',
      coefficient: 0.95,
      last_updated: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error fetching exchange rates:', error)

    // Fallback курсы если API недоступен
    return {
      rates: {
        'USD': 1.0,
        'EUR': 1.11,   // Fallback
        'GBP': 1.31,   // Fallback
        'CAD': 0.71    // Fallback
      },
      source: 'fallback',
      coefficient: 0.95,
      last_updated: new Date().toISOString(),
      error: 'API недоступен, используются резервные курсы'
    }
  }
}

// GET - Получить актуальные курсы валют
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'

    const now = Date.now()

    // Проверяем нужно ли обновить кеш (или принудительное обновление)
    if (!cachedRates || (now - lastUpdate) > CACHE_DURATION || forceRefresh) {
      console.log('Fetching fresh exchange rates...', forceRefresh ? '(forced)' : '')
      cachedRates = await fetchExchangeRates()
      lastUpdate = now
    }

    return NextResponse.json({
      success: true,
      ...cachedRates,
      cached: (now - lastUpdate) < CACHE_DURATION,
      cache_expires_in: Math.max(0, CACHE_DURATION - (now - lastUpdate)),
      next_update: new Date(lastUpdate + CACHE_DURATION).toISOString()
    })

  } catch (error) {
    console.error('Currency rates API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Принудительно обновить курсы (для админов)
export async function POST(request: Request) {
  try {
    // Можно добавить проверку прав доступа
    console.log('Force refreshing exchange rates...')

    cachedRates = await fetchExchangeRates()
    lastUpdate = Date.now()

    return NextResponse.json({
      success: true,
      message: 'Курсы валют принудительно обновлены',
      ...cachedRates
    })

  } catch (error) {
    console.error('Force refresh currency rates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
