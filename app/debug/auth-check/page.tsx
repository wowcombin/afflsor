'use client'

import { useState, useEffect } from 'react'

export default function AuthCheckPage() {
    const [authStatus, setAuthStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAuth()
    }, [])

    async function checkAuth() {
        try {
            setLoading(true)
            const response = await fetch('/api/debug/auth-status')
            const data = await response.json()
            setAuthStatus(data)
        } catch (error: any) {
            setAuthStatus({
                error: 'Failed to check auth',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-lg text-gray-600">Проверка аутентификации...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Диагностика аутентификации</h1>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Статус аутентификации</h3>
                                <div className={`text-lg font-bold ${authStatus?.authenticated ? 'text-green-600' : 'text-red-600'}`}>
                                    {authStatus?.authenticated ? '✅ Аутентифицирован' : '❌ Не аутентифицирован'}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Пользователь найден</h3>
                                <div className={`text-lg font-bold ${authStatus?.user_found ? 'text-green-600' : 'text-red-600'}`}>
                                    {authStatus?.user_found ? '✅ Найден в БД' : '❌ Не найден в БД'}
                                </div>
                            </div>
                        </div>

                        {authStatus?.auth_user && (
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Auth User</h3>
                                <pre className="text-sm text-gray-700">
                                    {JSON.stringify(authStatus.auth_user, null, 2)}
                                </pre>
                            </div>
                        )}

                        {authStatus?.user_data && (
                            <div className="p-4 bg-green-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">User Data</h3>
                                <pre className="text-sm text-gray-700">
                                    {JSON.stringify(authStatus.user_data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {authStatus?.permissions && (
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Permissions</h3>
                                <pre className="text-sm text-gray-700">
                                    {JSON.stringify(authStatus.permissions, null, 2)}
                                </pre>
                            </div>
                        )}

                        {authStatus?.error && (
                            <div className="p-4 bg-red-50 rounded-lg">
                                <h3 className="font-semibold text-red-900 mb-2">Ошибка</h3>
                                <div className="text-red-700">
                                    <div><strong>Error:</strong> {authStatus.error}</div>
                                    {authStatus.details && <div><strong>Details:</strong> {authStatus.details}</div>}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-2">Timestamp</h3>
                            <div className="text-sm text-gray-600">{authStatus?.timestamp}</div>
                        </div>
                    </div>

                    <div className="mt-6 flex space-x-3">
                        <button
                            onClick={checkAuth}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            🔄 Обновить
                        </button>
                        <a
                            href="/auth/login"
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            🔑 Войти
                        </a>
                        <a
                            href="/dashboard"
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            🏠 Dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
