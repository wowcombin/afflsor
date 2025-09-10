'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { User } from '@/types/database.types'
import {
    UserIcon,
    KeyIcon,
    CogIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
    const { addToast } = useToast()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Форма профиля
    const [profileForm, setProfileForm] = useState({
        first_name: '',
        last_name: '',
        telegram_username: '',
        usdt_wallet: ''
    })

    // Форма смены пароля
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)

    useEffect(() => {
        loadCurrentUser()
    }, [])

    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/users/me')

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка загрузки данных пользователя')
            }

            const { user } = await response.json()

            if (!user) {
                throw new Error('Данные пользователя не получены')
            }

            setCurrentUser(user)

            setProfileForm({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                telegram_username: user.telegram_username || '',
                usdt_wallet: user.usdt_wallet || ''
            })

        } catch (error: any) {
            console.error('Ошибка загрузки пользователя:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

  async function handleSaveProfile() {
    if (!currentUser) return

    // Валидация USDT кошелька перед отправкой
    if (profileForm.usdt_wallet.trim()) {
      const bep20Regex = /^0x[a-fA-F0-9]{40}$/
      if (!bep20Regex.test(profileForm.usdt_wallet.trim())) {
        addToast({
          type: 'error',
          title: 'Неверный формат кошелька',
          description: 'USDT кошелек должен быть в формате BEP20: 0x + 40 символов (0-9, a-f)'
        })
        return
      }
    }

    setSaving(true)

    try {
            const response = await fetch(`/api/users/${currentUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: profileForm.first_name.trim() || null,
                    last_name: profileForm.last_name.trim() || null,
                    telegram_username: profileForm.telegram_username.trim() || null,
                    usdt_wallet: profileForm.usdt_wallet.trim() || null
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сохранения профиля')
            }

            addToast({
                type: 'success',
                title: 'Профиль обновлен',
                description: 'Ваши данные успешно сохранены'
            })

            await loadCurrentUser() // Перезагружаем данные

        } catch (error: any) {
            console.error('Ошибка сохранения профиля:', error)
            addToast({
                type: 'error',
                title: 'Ошибка сохранения',
                description: error.message
            })
        } finally {
            setSaving(false)
        }
    }

    async function handleChangePassword() {
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
            addToast({ type: 'error', title: 'Заполните все поля пароля' })
            return
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            addToast({ type: 'error', title: 'Пароли не совпадают' })
            return
        }

        if (passwordForm.newPassword.length < 6) {
            addToast({ type: 'error', title: 'Пароль должен быть не менее 6 символов' })
            return
        }

        setChangingPassword(true)

        try {
            const response = await fetch('/api/users/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка смены пароля')
            }

            addToast({
                type: 'success',
                title: 'Пароль изменен',
                description: 'Ваш пароль успешно обновлен'
            })

            setShowPasswordModal(false)
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })

        } catch (error: any) {
            console.error('Ошибка смены пароля:', error)
            addToast({
                type: 'error',
                title: 'Ошибка смены пароля',
                description: error.message
            })
        } finally {
            setChangingPassword(false)
        }
    }

    const getRoleLabel = (role: string) => {
        const roleLabels = {
            'junior': 'Junior',
            'manager': 'Manager',
            'teamlead': 'Team Lead',
            'tester': 'Tester',
            'qa_assistant': 'QA Assistant',
            'hr': 'HR',
            'cfo': 'CFO',
            'ceo': 'CEO',
            'admin': 'Admin'
        }
        return roleLabels[role as keyof typeof roleLabels] || role
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'text-red-600 bg-red-50'
            case 'ceo': return 'text-purple-600 bg-purple-50'
            case 'cfo': return 'text-green-600 bg-green-50'
            case 'hr': return 'text-blue-600 bg-blue-50'
            case 'manager': return 'text-indigo-600 bg-indigo-50'
            case 'teamlead': return 'text-orange-600 bg-orange-50'
            case 'tester': return 'text-yellow-600 bg-yellow-50'
            case 'qa_assistant': return 'text-pink-600 bg-pink-50'
            case 'junior': return 'text-gray-600 bg-gray-50'
            default: return 'text-gray-600 bg-gray-50'
        }
    }

    if (loading || !currentUser) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Загрузка настроек...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
                    <p className="text-gray-600">Управление личными данными и безопасностью</p>
                </div>
            </div>

            {/* Информация о текущем пользователе */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <UserIcon className="h-5 w-5 mr-2" />
                        Информация о аккаунте
                    </h3>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <p className="text-lg font-semibold text-gray-900">{currentUser?.email || 'Не указан'}</p>
                            <p className="text-xs text-gray-500">Нельзя изменить</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Роль</label>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(currentUser.role || '')}`}>
                                {getRoleLabel(currentUser.role || '')}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">Назначается администратором</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Статус</label>
                            <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-green-600">
                                    {currentUser.status === 'active' ? 'Активен' :
                                        currentUser.status === 'inactive' ? 'Неактивен' : 'Уволен'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Редактирование профиля */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">Личные данные</h3>
                </div>
                <div className="card-body space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Имя</label>
                            <input
                                type="text"
                                value={profileForm.first_name}
                                onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                                className="form-input"
                                placeholder="Ваше имя"
                            />
                        </div>
                        <div>
                            <label className="form-label">Фамилия</label>
                            <input
                                type="text"
                                value={profileForm.last_name}
                                onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                                className="form-input"
                                placeholder="Ваша фамилия"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Telegram</label>
                            <input
                                type="text"
                                value={profileForm.telegram_username}
                                onChange={(e) => setProfileForm({ ...profileForm, telegram_username: e.target.value })}
                                className="form-input"
                                placeholder="@username"
                            />
                            <p className="text-xs text-gray-500 mt-1">Для связи и уведомлений</p>
                        </div>
            <div>
              <label className="form-label">USDT кошелек (BEP20)</label>
              <input
                type="text"
                value={profileForm.usdt_wallet}
                onChange={(e) => setProfileForm({ ...profileForm, usdt_wallet: e.target.value })}
                className="form-input"
                placeholder="0x1234567890abcdef1234567890abcdef12345678"
              />
              <p className="text-xs text-blue-600 mt-1">
                💡 <strong>Только BEP20 адреса!</strong> Формат: 0x + 40 символов (0-9, a-f)
              </p>
              <p className="text-xs text-gray-500">Для получения USDT выплат в сети Binance Smart Chain</p>
            </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveProfile}
                            className="btn-primary"
                            disabled={saving}
                        >
                            {saving ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Безопасность */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <KeyIcon className="h-5 w-5 mr-2" />
                        Безопасность
                    </h3>
                </div>
                <div className="card-body">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <h4 className="font-medium text-gray-900">Пароль</h4>
                            <p className="text-sm text-gray-600">Последний раз изменен: неизвестно</p>
                        </div>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="btn-secondary"
                        >
                            Изменить пароль
                        </button>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-yellow-800">Рекомендации по безопасности</h4>
                                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                                    <li>• Используйте сложный пароль (минимум 8 символов)</li>
                                    <li>• Включите двухфакторную аутентификацию если доступна</li>
                                    <li>• Не используйте один пароль для разных сервисов</li>
                                    <li>• Регулярно меняйте пароль (раз в 3 месяца)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Информация о зарплате (только для исполнителей) */}
            {['junior', 'teamlead', 'tester', 'qa_assistant'].includes(currentUser.role) && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">Информация о зарплате</h3>
                    </div>
                    <div className="card-body">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Процент от профита</label>
                                <p className="text-2xl font-bold text-primary-600">{currentUser.salary_percentage}%</p>
                                <p className="text-xs text-gray-500">От общего профита команды</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Фиксированный бонус</label>
                                <p className="text-2xl font-bold text-green-600">${currentUser.salary_bonus}</p>
                                <p className="text-xs text-gray-500">Ежемесячный бонус</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                💡 <strong>Как рассчитывается зарплата:</strong> Процент от профита + фиксированный бонус.
                                Для изменения параметров обратитесь к HR или администратору.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal смены пароля */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => {
                    setShowPasswordModal(false)
                    setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                    })
                }}
                title="Изменить пароль"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Текущий пароль</label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                className="form-input pr-10"
                                placeholder="Введите текущий пароль"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showCurrentPassword ? (
                                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Новый пароль</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="form-input pr-10"
                                placeholder="Введите новый пароль"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showNewPassword ? (
                                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Подтвердите новый пароль</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="form-input pr-10"
                                placeholder="Повторите новый пароль"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showConfirmPassword ? (
                                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => {
                                setShowPasswordModal(false)
                                setPasswordForm({
                                    currentPassword: '',
                                    newPassword: '',
                                    confirmPassword: ''
                                })
                            }}
                            className="btn-secondary"
                            disabled={changingPassword}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleChangePassword}
                            className="btn-primary"
                            disabled={changingPassword}
                        >
                            {changingPassword ? 'Изменение...' : 'Изменить пароль'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
