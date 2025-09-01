'use client'

import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: string
  status: string
  assigned_to: string | null
  exp_month: number
  exp_year: number
  daily_limit: number | null
  full_card_number?: string
  full_cvv?: string
}

interface BankAccount {
  id: string
  holder_name: string
  account_number: string
  balance: number
  currency: string
  is_active: boolean
  balance_updated_at: string
  last_updated: string
  cards_available: boolean
  cards: Card[]
  sort_code?: string
  bank_url?: string
  login_password?: string
}

interface ManagerBankModalsProps {
  // Edit Card Modal
  showEditCardModal: boolean
  setShowEditCardModal: (show: boolean) => void
  editingCard: Card | null
  setEditingCard: (card: Card | null) => void
  creating: boolean
  handleUpdateCard: () => Promise<void>

  // Card Details Modal
  showCardDetailsModal: boolean
  setShowCardDetailsModal: (show: boolean) => void
  viewingCard: Card | null
  setViewingCard: (card: Card | null) => void
  cardSecrets: {card_number: string, cvv: string} | null
  setCardSecrets: (secrets: {card_number: string, cvv: string} | null) => void

  // Edit Account Modal
  showEditAccountModal: boolean
  setShowEditAccountModal: (show: boolean) => void
  editingAccount: BankAccount | null
  setEditingAccount: (account: BankAccount | null) => void
  handleUpdateAccount: () => Promise<void>

  // Balance Edit Modal
  showBalanceEditModal: boolean
  setShowBalanceEditModal: (show: boolean) => void
  editingBalance: BankAccount | null
  setEditingBalance: (account: BankAccount | null) => void
  newBalance: number
  setNewBalance: (balance: number) => void
  balanceComment: string
  setBalanceComment: (comment: string) => void
  handleUpdateBalance: () => Promise<void>
  getCurrencySymbol: (currency: string) => string

  // Global History Modal
  showGlobalHistoryModal: boolean
  setShowGlobalHistoryModal: (show: boolean) => void
  globalHistory: any[]
  setGlobalHistory: (history: any[]) => void
  loadingHistory: boolean

  // Account History Modal
  showAccountHistoryModal: boolean
  setShowAccountHistoryModal: (show: boolean) => void
  viewingAccountHistory: BankAccount | null
  setViewingAccountHistory: (account: BankAccount | null) => void
  accountHistory: any[]
  setAccountHistory: (history: any[]) => void
}

export default function ManagerBankModals({
  showEditCardModal,
  setShowEditCardModal,
  editingCard,
  setEditingCard,
  creating,
  handleUpdateCard,
  showCardDetailsModal,
  setShowCardDetailsModal,
  viewingCard,
  setViewingCard,
  cardSecrets,
  setCardSecrets,
  showEditAccountModal,
  setShowEditAccountModal,
  editingAccount,
  setEditingAccount,
  handleUpdateAccount,
  showBalanceEditModal,
  setShowBalanceEditModal,
  editingBalance,
  setEditingBalance,
  newBalance,
  setNewBalance,
  balanceComment,
  setBalanceComment,
  handleUpdateBalance,
  getCurrencySymbol,
  showGlobalHistoryModal,
  setShowGlobalHistoryModal,
  globalHistory,
  setGlobalHistory,
  loadingHistory,
  showAccountHistoryModal,
  setShowAccountHistoryModal,
  viewingAccountHistory,
  setViewingAccountHistory,
  accountHistory,
  setAccountHistory
}: ManagerBankModalsProps) {
  const { addToast } = useToast()

  return (
    <>
      {/* Modal редактирования карты */}
      <Modal
        isOpen={showEditCardModal}
        onClose={() => {
          setShowEditCardModal(false)
          setEditingCard(null)
        }}
        title="Редактировать карту"
        size="lg"
      >
        {editingCard && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">📝 Редактирование карты</p>
                <p className="text-gray-700">Карта: {editingCard.card_number_mask}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Полный номер карты</label>
                <input
                  type="text"
                  value={editingCard.full_card_number || ''}
                  onChange={(e) => setEditingCard({...editingCard, full_card_number: e.target.value})}
                  className="form-input font-mono"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              <div>
                <label className="form-label">CVV</label>
                <input
                  type="text"
                  value={editingCard.full_cvv || ''}
                  onChange={(e) => setEditingCard({...editingCard, full_cvv: e.target.value})}
                  className="form-input font-mono text-center"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="form-label">BIN код</label>
              <input
                type="text"
                value={editingCard.card_bin}
                onChange={(e) => setEditingCard({...editingCard, card_bin: e.target.value})}
                className="form-input"
                placeholder="123456"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Месяц истечения</label>
                <select
                  value={editingCard.exp_month}
                  onChange={(e) => setEditingCard({...editingCard, exp_month: parseInt(e.target.value)})}
                  className="form-input"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {month.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Год истечения</label>
                <select
                  value={editingCard.exp_year}
                  onChange={(e) => setEditingCard({...editingCard, exp_year: parseInt(e.target.value)})}
                  className="form-input"
                >
                  {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Тип карты</label>
                <select
                  value={editingCard.card_type}
                  onChange={(e) => setEditingCard({...editingCard, card_type: e.target.value})}
                  className="form-input"
                >
                  <option value="grey">⚫ Серая</option>
                  <option value="pink">🌸 Розовая</option>
                </select>
              </div>

              <div>
                <label className="form-label">Статус</label>
                <select
                  value={editingCard.status}
                  onChange={(e) => setEditingCard({...editingCard, status: e.target.value})}
                  className="form-input"
                >
                  <option value="active">✅ Активна</option>
                  <option value="blocked">🚫 Заблокирована</option>
                  <option value="inactive">⏸️ Неактивна</option>
                </select>
              </div>
            </div>

            {editingCard.card_type === 'pink' && (
              <div>
                <label className="form-label">Дневной лимит ($)</label>
                <input
                  type="number"
                  value={editingCard.daily_limit || 0}
                  onChange={(e) => setEditingCard({...editingCard, daily_limit: parseFloat(e.target.value) || 0})}
                  className="form-input"
                  placeholder="1000.00"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowEditCardModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateCard}
                className="btn-primary"
                disabled={creating}
              >
                {creating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal просмотра полных данных карты */}
      <Modal
        isOpen={showCardDetailsModal}
        onClose={() => {
          setShowCardDetailsModal(false)
          setViewingCard(null)
          setCardSecrets(null)
        }}
        title="Полные данные карты"
        size="md"
      >
        {viewingCard && cardSecrets && (
          <div className="space-y-4">
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
              <div className="text-sm text-warning-800">
                <p className="font-medium">⚠️ Конфиденциальные данные</p>
                <p>Не передавайте эти данные третьим лицам</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Основная информация</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Тип:</span>
                    <span>{viewingCard.card_type === 'pink' ? '🌸 Розовая' : '⚫ Серая'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Статус:</span>
                    <StatusBadge status={viewingCard.status} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BIN:</span>
                    <span className="font-mono">{viewingCard.card_bin}</span>
                  </div>
                  {viewingCard.daily_limit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Дневной лимит:</span>
                      <span>${viewingCard.daily_limit}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Секретные данные</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Номер карты
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={cardSecrets.card_number}
                        readOnly
                        className="form-input font-mono text-lg"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cardSecrets.card_number)
                          addToast({ type: 'success', title: 'Номер карты скопирован' })
                        }}
                        className="text-primary-600 hover:text-primary-800"
                        title="Скопировать номер"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={cardSecrets.cvv}
                          readOnly
                          className="form-input font-mono text-center"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cardSecrets.cvv)
                            addToast({ type: 'success', title: 'CVV скопирован' })
                          }}
                          className="text-primary-600 hover:text-primary-800"
                          title="Скопировать CVV"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Срок действия
                      </label>
                      <input
                        type="text"
                        value={`${viewingCard.exp_month.toString().padStart(2, '0')}/${viewingCard.exp_year}`}
                        readOnly
                        className="form-input font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {viewingCard.assigned_to && (
                <div className="bg-info-50 border border-info-200 rounded-lg p-3">
                  <div className="text-sm text-info-800">
                    <p className="font-medium">👤 Назначение</p>
                    <p>Карта назначена Junior пользователю</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setShowCardDetailsModal(false)
                  setViewingCard(null)
                  setCardSecrets(null)
                }}
                className="btn-secondary"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal редактирования аккаунта */}
      <Modal
        isOpen={showEditAccountModal}
        onClose={() => {
          setShowEditAccountModal(false)
          setEditingAccount(null)
        }}
        title="Редактировать аккаунт"
        size="md"
      >
        {editingAccount && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">✏️ Редактирование аккаунта</p>
                <p className="text-gray-700">Аккаунт: {editingAccount.holder_name}</p>
              </div>
            </div>

            <div>
              <label className="form-label">Имя держателя аккаунта *</label>
              <input
                type="text"
                value={editingAccount.holder_name}
                onChange={(e) => setEditingAccount({...editingAccount, holder_name: e.target.value})}
                className="form-input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="form-label">Acc number</label>
              <input
                type="text"
                value={editingAccount.account_number || ''}
                onChange={(e) => setEditingAccount({...editingAccount, account_number: e.target.value})}
                className="form-input"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="form-label">Sort Code</label>
              <input
                type="text"
                value={editingAccount.sort_code || ''}
                onChange={(e) => setEditingAccount({...editingAccount, sort_code: e.target.value})}
                className="form-input"
                placeholder="12-34-56"
              />
            </div>

            <div>
              <label className="form-label">Ссылка на банк</label>
              <input
                type="url"
                value={editingAccount.bank_url || ''}
                onChange={(e) => setEditingAccount({...editingAccount, bank_url: e.target.value})}
                className="form-input"
                placeholder="https://example-bank.com"
              />
            </div>

            <div>
              <label className="form-label">Пароль для входа</label>
              <input
                type="password"
                value={editingAccount.login_password || ''}
                onChange={(e) => setEditingAccount({...editingAccount, login_password: e.target.value})}
                className="form-input"
                placeholder="Пароль для онлайн банкинга"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowEditAccountModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateAccount}
                className="btn-primary"
                disabled={creating || !editingAccount.holder_name.trim()}
              >
                {creating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal редактирования баланса */}
      <Modal
        isOpen={showBalanceEditModal}
        onClose={() => {
          setShowBalanceEditModal(false)
          setEditingBalance(null)
        }}
        title="Изменить баланс"
        size="md"
      >
        {editingBalance && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">💰 Изменение баланса</p>
                <p className="text-gray-700">Аккаунт: {editingBalance.holder_name}</p>
                <p className="text-gray-700">Текущий: {getCurrencySymbol(editingBalance.currency || 'USD')}{editingBalance.balance.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="form-label">Новый баланс</label>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-medium">{getCurrencySymbol(editingBalance.currency || 'USD')}</span>
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                  className="form-input flex-1"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-gray-500">{editingBalance.currency}</span>
              </div>
            </div>

            <div>
              <label className="form-label">Причина изменения *</label>
              <textarea
                value={balanceComment}
                onChange={(e) => setBalanceComment(e.target.value)}
                className="form-input"
                placeholder="Укажите причину изменения баланса..."
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowBalanceEditModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateBalance}
                className="btn-primary"
                disabled={creating || !balanceComment.trim()}
              >
                {creating ? 'Сохранение...' : 'Сохранить баланс'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal общей истории */}
      <Modal
        isOpen={showGlobalHistoryModal}
        onClose={() => {
          setShowGlobalHistoryModal(false)
          setGlobalHistory([])
        }}
        title="Общая история действий"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-info-50 border border-info-200 rounded-lg p-3">
            <div className="text-sm text-info-800">
              <p className="font-medium text-gray-800">📚 История всех действий</p>
              <p className="text-gray-700">Создание банков, аккаунтов, карт, изменения балансов</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка истории...</p>
            </div>
          ) : globalHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>История действий пуста</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3">
              {globalHistory.map((entry, index) => (
                <div key={entry.id || index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.action_type?.includes('card') 
                            ? 'bg-success-100 text-success-800' 
                            : entry.action_type?.includes('bank')
                            ? 'bg-warning-100 text-warning-800'
                            : entry.action_type?.includes('account')
                            ? 'bg-info-100 text-info-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}>
                          {entry.action_type?.includes('card') && '🃏'}
                          {entry.action_type?.includes('bank') && '🏦'}
                          {entry.action_type?.includes('account') && '👤'}
                          {entry.action_type?.includes('balance') && '💰'}
                          {' '}
                          {entry.entity_type?.charAt(0).toUpperCase() + entry.entity_type?.slice(1) || 'Действие'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {entry.action}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Объект:</span> {entry.entity_name}
                        </div>
                        {entry.entity_details && (
                          <div>
                            <span className="font-medium">Детали:</span> 
                            {entry.entity_details.bank_name && ` Банк: ${entry.entity_details.bank_name}`}
                            {entry.entity_details.account_name && ` Аккаунт: ${entry.entity_details.account_name}`}
                            {entry.entity_details.card_type && ` Тип: ${entry.entity_details.card_type}`}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Выполнил:</span> {entry.user.name} ({entry.user.role})
                        </div>
                        {entry.ip_address && (
                          <div>
                            <span className="font-medium">IP:</span> {entry.ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-right">
                      {new Date(entry.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setShowGlobalHistoryModal(false)}
              className="btn-secondary"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal истории аккаунта */}
      <Modal
        isOpen={showAccountHistoryModal}
        onClose={() => {
          setShowAccountHistoryModal(false)
          setViewingAccountHistory(null)
          setAccountHistory([])
        }}
        title="История аккаунта"
        size="lg"
      >
        {viewingAccountHistory && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">📊 История аккаунта</p>
                <p className="text-gray-700">Аккаунт: {viewingAccountHistory.holder_name}</p>
                <p className="text-gray-700">Текущий баланс: {getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{viewingAccountHistory.balance.toFixed(2)}</p>
              </div>
            </div>

            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка истории...</p>
              </div>
            ) : accountHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>История изменений пуста</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3">
                {accountHistory.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            💰 Баланс
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {entry.change_reason || 'Изменение баланса'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">Изменение:</span> 
                            <span className={entry.change_amount >= 0 ? 'text-success-600' : 'text-danger-600'}>
                              {getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{entry.old_balance} → {getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{entry.new_balance} 
                              ({entry.change_amount >= 0 ? '+' : ''}{getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{entry.change_amount})
                            </span>
                          </div>
                          {entry.changed_by_name && (
                            <div>
                              <span className="font-medium">Выполнил:</span> {entry.changed_by_name}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 text-right">
                        {new Date(entry.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowAccountHistoryModal(false)}
                className="btn-info"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
