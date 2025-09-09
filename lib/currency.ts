/**
 * Единая система конвертации валют для всего приложения
 * Использует динамические курсы с Google API с коэффициентом -5% (брутто)
 */

// Fallback курсы если API недоступен
const FALLBACK_RATES: { [key: string]: number } = {
  'USD': 0.95,
  'GBP': 1.27 * 0.95, // Google rate -5%
  'EUR': 1.09 * 0.95,
  'CAD': 0.74 * 0.95
}

// Кеш для курсов валют
let cachedRates: { [key: string]: number } | null = null
let lastFetch: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 час

/**
 * Загружает актуальные курсы валют с API
 */
async function fetchCurrencyRates(): Promise<{ [key: string]: number }> {
  try {
    const response = await fetch('/api/currency-rates')
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.rates) {
        return data.rates
      }
    }
  } catch (error) {
    console.error('Failed to fetch currency rates:', error)
  }
  
  return FALLBACK_RATES
}

/**
 * Получает актуальные курсы валют (с кешированием)
 */
async function getRates(): Promise<{ [key: string]: number }> {
  const now = Date.now()
  
  // Проверяем кеш
  if (cachedRates && (now - lastFetch) < CACHE_DURATION) {
    return cachedRates
  }
  
  // Загружаем новые курсы
  cachedRates = await fetchCurrencyRates()
  lastFetch = now
  
  return cachedRates
}

/**
 * Конвертирует сумму в USD с применением коэффициента -5%
 * Использует динамические курсы с Google API
 */
export async function convertToUSD(amount: number, currency: string): Promise<number> {
  if (!amount || amount === 0) return 0
  
  const rates = await getRates()
  const rate = rates[currency] || FALLBACK_RATES[currency] || 1
  return amount * rate
}

/**
 * Синхронная версия конвертации (использует кеш или fallback)
 * Для использования в компонентах где нельзя использовать async
 */
export function convertToUSDSync(amount: number, currency: string, rates?: { [key: string]: number }): number {
  if (!amount || amount === 0) return 0
  
  const currentRates = rates || cachedRates || FALLBACK_RATES
  const rate = currentRates[currency] || FALLBACK_RATES[currency] || 1
  return amount * rate
}

/**
 * Получает курс валюты к USD
 */
export async function getCurrencyRate(currency: string): Promise<number> {
  const rates = await getRates()
  return rates[currency] || FALLBACK_RATES[currency] || 1
}

/**
 * Получает все доступные курсы валют
 */
export async function getAllRates(): Promise<{ [key: string]: number }> {
  return await getRates()
}

/**
 * Форматирует сумму в валюте
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'CAD': 'C$'
  }
  
  const symbol = symbols[currency] || currency
  return `${symbol}${amount.toFixed(2)}`
}

/**
 * Определяет валюту казино по данным
 */
export function getCasinoCurrency(casinoData: any): string {
  // Приоритет: casino_currency > casinos.currency > определение по названию
  if (casinoData.casino_currency) {
    return casinoData.casino_currency
  }
  
  if (casinoData.casinos?.currency) {
    return casinoData.casinos.currency
  }
  
  // Fallback логика по названию казино
  const casinoName = (casinoData.casino_name || '').toLowerCase()
  if (casinoName.includes('uk') || casinoName.includes('british') || casinoName.includes('virgin')) {
    return 'GBP'
  }
  if (casinoName.includes('euro')) {
    return 'EUR'
  }
  
  return 'USD' // По умолчанию
}
