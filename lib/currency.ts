/**
 * Единая система конвертации валют для всего приложения
 * Использует курсы с коэффициентом -5% (брутто)
 */

// Статичные курсы валют с коэффициентом -5% (как в аналитике)
const STATIC_RATES: { [key: string]: number } = {
  'USD': 1,
  'GBP': 1.27 * 0.95, // Google rate -5%
  'EUR': 1.09 * 0.95,
  'CAD': 0.74 * 0.95
}

/**
 * Конвертирует сумму в USD с применением коэффициента -5%
 * Использует статичные курсы для консистентности
 */
export function convertToUSD(amount: number, currency: string): number {
  if (!amount || amount === 0) return 0
  
  const rate = STATIC_RATES[currency] || 1
  return amount * rate
}

/**
 * Получает курс валюты к USD
 */
export function getCurrencyRate(currency: string): number {
  return STATIC_RATES[currency] || 1
}

/**
 * Получает все доступные курсы валют
 */
export function getAllRates(): { [key: string]: number } {
  return { ...STATIC_RATES }
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
