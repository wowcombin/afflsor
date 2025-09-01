'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  BuildingLibraryIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface BanksManagerProps {
  userRole: 'manager' | 'hr' | 'tester' | 'cfo' | 'admin'
}

export default function BanksManager({ userRole }: BanksManagerProps) {
  const { addToast } = useToast()
  const [banks, setBanks] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showBlockedAccounts, setShowBlockedAccounts] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [exchangeRates, setExchangeRates] = useState<any>(null)

  // Права по ролям
  const permissions = {
    canCreateBank: ['cfo', 'admin'].includes(userRole),
    canEditAccount: ['manager', 'hr', 'cfo', 'admin'].includes(userRole),
    canBlockAccount: ['cfo', 'admin'].includes(userRole),
    canDeleteAccount: ['cfo', 'admin'].includes(userRole),
    canCreateCard: ['manager', 'hr', 'cfo', 'admin'].includes(userRole),
    canEditCard: ['manager', 'hr', 'cfo', 'admin'].includes(userRole),
    canDeleteCard: ['cfo', 'admin'].includes(userRole),
    canEditBalance: ['manager', 'hr', 'cfo', 'admin'].includes(userRole),
    canViewHistory: ['manager', 'hr', 'cfo', 'admin'].includes(userRole)
  }

  const getCurrencySymbol = (currency: string) => {
    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$' }
    return symbols[currency as keyof typeof symbols] || currency
  }

  useEffect(() => {
    loadBanks()
  }, [])

  async function loadBanks() {
    try {
      const response = await fetch('/api/banks')
      if (!response.ok) {
        throw new Error('Ошибка загрузки банков')
      }

      const { banks: banksData, statistics, exchange_rates } = await response.json()
      setBanks(banksData || [])
      setStats(statistics || {})
      setExchangeRates(exchange_rates || null)

    } catch (error: any) {
      addToast({ type: 'error', title: 'Ошибка загрузки', description: error.message })
    } finally {
      setLoading(false)
    }
  }

  function toggleAccountCards(accountId: string) {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  if (loading) {
    return <div className="animate-pulse p-6">Загрузка банков...</div>
  }

  const roleTitle = {
    manager: 'Банки и карты',
    hr: 'Банки и балансы', 
    tester: 'Просмотр банков',
    cfo: 'Управление банками',
    admin: 'Администрирование банков'
  }

  const roleDescription = {
    manager: 'Управление картами и балансами',
    hr: 'Контроль балансов и карт',
    tester: 'Просмотр банковской информации',
    cfo: 'Банки, аккаунты и управление балансами', 
    admin: 'Полное управление банковской системой'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{roleTitle[userRole]}</h1>
          <p className="text-gray-600">{roleDescription[userRole]}</p>
        </div>
        <div className="flex space-x-3">
          {permissions.canViewHistory && (
            <button className="btn-info">📚 Общая история</button>
          )}
          <button
            onClick={() => setShowBlockedAccounts(!showBlockedAccounts)}
            className={showBlockedAccounts ? "btn-info" : "btn-danger"}
          >
            {showBlockedAccounts ? 'Показать активные' : 'Заблокированные аккаунты'}
          </button>
          {permissions.canCreateBank && (
            <button className="btn-success">
              <PlusIcon className="h-5 w-5 mr-2" />
              Новый банк
            </button>
          )}
        </div>
      </div>

      {/* Курсы валют */}
      {exchangeRates && (
        <div className="bg-info-50 border border-info-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-info-800">
                💱 Курсы валют к USD ({exchangeRates.source === 'exchangerate-api.com' ? 'Актуальные' : 'Резервные'})
              </span>
              <div className="flex items-center space-x-3 text-xs text-info-600">
                <span>💶 EUR: {exchangeRates.rates?.EUR?.toFixed(3)}</span>
                <span>💷 GBP: {exchangeRates.rates?.GBP?.toFixed(3)}</span>
                <span>🍁 CAD: {exchangeRates.rates?.CAD?.toFixed(3)}</span>
              </div>
            </div>
            <div className="text-xs text-info-600">
              Обновлено: {new Date(exchangeRates.last_updated).toLocaleTimeString('ru-RU')}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Банки"
          value={stats.total_banks || 0}
          icon={<BuildingLibraryIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title={showBlockedAccounts ? "Заблокированных" : "Активных аккаунтов"}
          value={showBlockedAccounts ? (stats.blocked_accounts || 0) : (stats.active_accounts || 0)}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color={showBlockedAccounts ? "warning" : "success"}
        />
        <KPICard
          title={showBlockedAccounts ? "Заблок. баланс" : "Общий баланс"}
          value={`$${Number(showBlockedAccounts ? (stats.blocked_balance || 0) : (stats.total_balance || 0)).toFixed(2)}`}
          icon={<span className="text-xl">💰</span>}
          color={showBlockedAccounts ? "warning" : "success"}
        />
        <KPICard
          title="Всего карт"
          value={stats.total_cards || 0}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Доступные карты"
          value={stats.available_cards || 0}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Низкий баланс"
          value={stats.low_balance_accounts || 0}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Banks List */}
      <div className="space-y-6">
        {(showBlockedAccounts ? 
          banks.filter(bank => bank.accounts.some((acc: any) => !acc.is_active)).map(bank => ({
            ...bank,
            accounts: bank.accounts.filter((acc: any) => !acc.is_active)
          })) :
          banks.filter(bank => bank.accounts.some((acc: any) => acc.is_active)).map(bank => ({
            ...bank,
            accounts: bank.accounts.filter((acc: any) => acc.is_active)
          }))
        ).map(bank => (
          <div key={bank.id} className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BuildingLibraryIcon className="h-8 w-8 text-primary-600 mr-3" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{bank.name}</h3>
                    <p className="text-sm text-gray-500">{bank.country} • {bank.currency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Аккаунтов: {bank.accounts.length}</div>
                  <span className="text-xs text-success-600 font-medium">✅ Активный банк</span>
                </div>
              </div>
            </div>

            <div>
              {/* Кнопка добавления аккаунта (только для CFO/Admin) */}
              {bank.is_active && permissions.canCreateBank && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <button className="btn-success text-sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Добавить аккаунт
                  </button>
                </div>
              )}

              {bank.accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет аккаунтов</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bank.accounts.map((account: any) => (
                    <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                      {/* Заголовок аккаунта */}
                      <div className="mb-3 pb-2 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {account.holder_name}
                              </h4>
                              {/* Кнопки управления по ролям */}
                              <div className="flex items-center space-x-2">
                                {account.is_active ? (
                                  <>
                                    {permissions.canCreateCard && (
                                      <button className="btn-success text-xs px-2 py-1" title="Добавить карту">🃏+</button>
                                    )}
                                    {permissions.canViewHistory && (
                                      <button className="btn-info text-xs px-2 py-1" title="История аккаунта">📊</button>
                                    )}
                                    {permissions.canEditBalance && (
                                      <button className="btn-info text-xs px-2 py-1" title="Изменить баланс">💰</button>
                                    )}
                                    {permissions.canEditAccount && (
                                      <button className="btn-info text-xs px-2 py-1" title="Редактировать">✏️</button>
                                    )}
                                    {permissions.canBlockAccount && (
                                      <button className="btn-danger text-xs px-2 py-1" title="Заблокировать">🚫</button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs text-danger-600 font-medium">🚫 Заблокирован</span>
                                    {permissions.canBlockAccount && (
                                      <button className="btn-success text-xs px-2 py-1" title="Разблокировать">✅</button>
                                    )}
                                    {permissions.canDeleteAccount && (
                                      <button className="btn-danger text-xs px-2 py-1" title="Удалить">🗑️</button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 mt-2">
                              <div className="flex items-center space-x-4">
                                <span><span className="font-medium">Acc number:</span> {account.account_number || 'Не указан'}</span>
                                {account.sort_code && <span><span className="font-medium">Sort:</span> {account.sort_code}</span>}
                                <span>
                                  <span className="font-medium">Баланс:</span> 
                                  <span className={`ml-1 font-semibold ${(account.balance || 0) >= 10 ? 'text-success-600' : 'text-danger-600'}`}>
                                    {getCurrencySymbol(account.currency || 'USD')}{(account.balance || 0).toFixed(2)}
                                  </span>
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-4">
                                {account.bank_url ? (
                                  <a href={account.bank_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 text-sm">
                                    🔗 Онлайн банкинг
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">🔗 Ссылка не указана</span>
                                )}
                                
                                {account.login_password ? (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm"><span className="font-medium">Пароль:</span> {'•'.repeat(8)}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(account.login_password!)
                                        addToast({ type: 'success', title: 'Пароль скопирован' })
                                      }}
                                      className="text-primary-600 hover:text-primary-800 text-sm"
                                      title="Скопировать пароль"
                                    >
                                      📋
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">🔑 Пароль не указан</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Карты аккаунта */}
                      {account.cards && account.cards.length > 0 && (
                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Карты ({account.cards.length})</h4>
                            <button
                              onClick={() => toggleAccountCards(account.id)}
                              className="text-xs text-primary-600 hover:text-primary-800"
                            >
                              {expandedAccounts.has(account.id) ? '▼ Скрыть карты' : '▶ Показать карты'}
                            </button>
                          </div>
                          {expandedAccounts.has(account.id) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {account.cards.map((card: any) => (
                                <div key={card.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-mono text-sm font-medium text-gray-900">
                                        {card.card_number_mask}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        BIN: {card.card_bin} • {card.card_type === 'pink' ? '🌸 Pink' : '⚫ Grey'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
                                      </div>
                                      {card.assigned_to && (
                                        <div className="text-xs text-primary-600 mt-1">👤 Назначена Junior</div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <StatusBadge status={card.status} size="sm" />
                                      {card.daily_limit && (
                                        <div className="text-xs text-gray-500 mt-1">Лимит: ${card.daily_limit}</div>
                                      )}
                                      {(permissions.canEditCard || permissions.canDeleteCard) && (
                                        <div className="flex space-x-1 mt-2">
                                          {permissions.canEditCard && (
                                            <>
                                              <button className="text-xs text-info-600 hover:text-info-800" title="Показать данные">👁️</button>
                                              <button className="text-xs text-primary-600 hover:text-primary-800" title="Редактировать">✏️</button>
                                            </>
                                          )}
                                          {permissions.canDeleteCard && (
                                            <button className="text-xs text-danger-600 hover:text-danger-800" title="Удалить">🗑️</button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
