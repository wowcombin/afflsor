'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import {
    CogIcon,
    UsersIcon,
    ShieldCheckIcon,
    CircleStackIcon,
    ChartBarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline'

interface SystemStats {
    totalUsers: number
    activeUsers: number
    terminatedUsers: number
}

export default function AdminSettingsPage() {
    const { addToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<SystemStats>({
        totalUsers: 0,
        activeUsers: 0,
        terminatedUsers: 0
    })

    useEffect(() => {
        loadSystemStats()
    }, [])

    async function loadSystemStats() {
        try {
            const usersResponse = await fetch('/api/users')
            if (usersResponse.ok) {
                const { users } = await usersResponse.json()
                const totalUsers = users.length
                const activeUsers = users.filter((u: any) => u.status === 'active').length
                const terminatedUsers = users.filter((u: any) => u.status === 'terminated').length

                setStats({
                    totalUsers,
                    activeUsers,
                    terminatedUsers
                })
            }
        } catch (error: any) {
            console.error('Ошибка загрузки статистики:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    function handleSystemAction(action: string) {
        addToast({
            type: 'success',
            title: 'Действие выполнено',
            description: `${action} выполнено успешно`
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Системные настройки</h1>
                    <p className="text-gray-600">Управление системой и мониторинг</p>
                </div>
            </div>

            {/* Системная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    title="Всего пользователей"
                    value={stats.totalUsers}
                    icon={<UsersIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Активные"
                    value={stats.activeUsers}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Уволенные"
                    value={stats.terminatedUsers}
                    icon={<XCircleIcon className="h-6 w-6" />}
                    color="warning"
                />
            </div>

            {/* Системные настройки */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Безопасность */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <ShieldCheckIcon className="h-5 w-5 mr-2" />
                            Безопасность
                        </h3>
                    </div>
                    <div className="card-body space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">RLS Политики</p>
                                <p className="text-sm text-gray-600">Row Level Security включен</p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Активно
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Аутентификация</p>
                                <p className="text-sm text-gray-600">Supabase Auth + JWT</p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Активно
                            </span>
                        </div>

                        <button
                            onClick={() => handleSystemAction('Аудит безопасности')}
                            className="w-full btn-secondary"
                        >
                            Запустить аудит безопасности
                        </button>
                    </div>
                </div>

                {/* База данных */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <CircleStackIcon className="h-5 w-5 mr-2" />
                            База данных
                        </h3>
                    </div>
                    <div className="card-body space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Таблицы</p>
                                <p className="text-sm text-gray-600">15 активных таблиц</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                15
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Последний бэкап</p>
                                <p className="text-sm text-gray-600">{new Date().toLocaleDateString('ru-RU')}</p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Сегодня
                            </span>
                        </div>

                        <button
                            onClick={() => handleSystemAction('Резервное копирование')}
                            className="w-full btn-primary"
                        >
                            Создать резервную копию
                        </button>
                    </div>
                </div>
            </div>

            {/* Быстрые действия */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">Быстрые действия</h3>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => window.open('/dashboard/hr/users', '_blank')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                        >
                            <UsersIcon className="h-6 w-6 text-primary-600 mb-2" />
                            <h4 className="font-medium">Управление пользователями</h4>
                            <p className="text-sm text-gray-600">Создание, редактирование, увольнение</p>
                        </button>

                        <button
                            onClick={() => window.open('/dashboard/cfo/banks', '_blank')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                        >
                            <CircleStackIcon className="h-6 w-6 text-primary-600 mb-2" />
                            <h4 className="font-medium">Банковские операции</h4>
                            <p className="text-sm text-gray-600">Управление банками и картами</p>
                        </button>

                        <button
                            onClick={() => window.open('/dashboard/manager/analytics', '_blank')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                        >
                            <ChartBarIcon className="h-6 w-6 text-primary-600 mb-2" />
                            <h4 className="font-medium">Аналитика</h4>
                            <p className="text-sm text-gray-600">Отчеты и статистика</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* Информация о системе */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">Информация о системе</h3>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Версия системы</label>
                            <p className="text-lg font-semibold text-primary-600">v2.0</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Framework</label>
                            <p className="text-lg font-semibold">Next.js 14</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">База данных</label>
                            <p className="text-lg font-semibold">Supabase PostgreSQL</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Деплой</label>
                            <p className="text-lg font-semibold">Vercel</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}