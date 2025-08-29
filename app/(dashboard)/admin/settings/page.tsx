'use client'

import { useState } from 'react'
import FormCard from '@/components/ui/FormCard'
import KPICard from '@/components/ui/KPICard'
import { CogIcon, ShieldCheckIcon, BanknotesIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    // Финансовые параметры
    juniorBasePercentage: 10,
    bonusThreshold: 2000,
    bonusAmount: 200,
    leaderBonus: 10,
    managerPercentage: 10,
    hrPercentage: 5,
    cfoPercentage: 5,
    testerPercentage: 10,
    expenseThreshold: 20,
    
    // Операционные лимиты
    maxCardsPerJunior: 8,
    minExperienceDays: 30,
    pinkCardsPerDay: 5,
    sessionTimeout: 15,
    logoutWarning: 2,
    
    // Системные параметры
    cvvPin: '****',
    backupSchedule: '0 3 * * *',
    force2FA: true
  })
  
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      // TODO: Реализовать API сохранения настроек
      await new Promise(resolve => setTimeout(resolve, 1000)) // Заглушка
      console.log('Settings saved:', settings)
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Системные настройки</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Базовый % Junior"
          value={`${settings.juniorBasePercentage}%`}
          color="blue"
          icon={<CogIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Макс карт на Junior"
          value={settings.maxCardsPerJunior.toString()}
          color="green"
          icon={<ShieldCheckIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Таймаут сессии"
          value={`${settings.sessionTimeout} мин`}
          color="yellow"
          icon={<ClockIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Порог расходов"
          value={`${settings.expenseThreshold}%`}
          color={settings.expenseThreshold > 20 ? "red" : "green"}
          icon={<BanknotesIcon className="h-6 w-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Финансовые параметры */}
        <FormCard title="Финансовые параметры">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Базовый % Junior
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.juniorBasePercentage}
                    onChange={(e) => setSettings({...settings, juniorBasePercentage: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Порог бонуса
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.bonusThreshold}
                    onChange={(e) => setSettings({...settings, bonusThreshold: parseInt(e.target.value)})}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.managerPercentage}
                  onChange={(e) => setSettings({...settings, managerPercentage: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.hrPercentage}
                  onChange={(e) => setSettings({...settings, hrPercentage: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CFO %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.cfoPercentage}
                  onChange={(e) => setSettings({...settings, cfoPercentage: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Критический порог расходов (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.expenseThreshold}
                onChange={(e) => setSettings({...settings, expenseThreshold: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                При превышении будет отправлено уведомление
              </p>
            </div>
          </div>
        </FormCard>

        {/* Операционные лимиты */}
        <FormCard title="Операционные лимиты">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Макс карт на Junior
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxCardsPerJunior}
                  onChange={(e) => setSettings({...settings, maxCardsPerJunior: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Мин стаж (дни)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.minExperienceDays}
                  onChange={(e) => setSettings({...settings, minExperienceDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Розовых карт в день
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={settings.pinkCardsPerDay}
                  onChange={(e) => setSettings({...settings, pinkCardsPerDay: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Таймаут сессии (мин)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </FormCard>

        {/* Системные параметры */}
        <FormCard title="Системные параметры">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN для CVV
              </label>
              <input
                type="password"
                value={settings.cvvPin}
                onChange={(e) => setSettings({...settings, cvvPin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Введите новый PIN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Расписание backup (cron)
              </label>
              <input
                type="text"
                value={settings.backupSchedule}
                onChange={(e) => setSettings({...settings, backupSchedule: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="0 3 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">
                Текущее: каждый день в 3:00 UTC
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="force2FA"
                checked={settings.force2FA}
                onChange={(e) => setSettings({...settings, force2FA: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="force2FA" className="ml-2 block text-sm text-gray-900">
                Обязательная 2FA для всех пользователей
              </label>
            </div>
          </div>
        </FormCard>

        {/* Быстрые действия */}
        <FormCard title="Быстрые действия">
          <div className="space-y-3">
            <button 
              onClick={() => window.open('/hr/users/new', '_blank')}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-800 font-medium text-left transition-colors"
            >
              👤 Создать нового пользователя
            </button>
            
            <button 
              onClick={() => window.open('/cfo/salaries', '_blank')}
              className="w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-800 font-medium text-left transition-colors"
            >
              💰 Рассчитать зарплаты
            </button>
            
            <button 
              onClick={() => window.open('/manager/cards', '_blank')}
              className="w-full p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-800 font-medium text-left transition-colors"
            >
              💳 Управление картами
            </button>
            
            <button 
              onClick={() => alert('Функция экспорта логов в разработке')}
              className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-800 font-medium text-left transition-colors"
            >
              📊 Экспорт системных логов
            </button>
          </div>
        </FormCard>
      </div>

      {/* Предупреждение */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Предупреждение о системных настройках
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Изменение этих параметров влияет на всю систему. Убедитесь, что понимаете последствия изменений.
                Рекомендуется создать резервную копию перед применением критических изменений.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
