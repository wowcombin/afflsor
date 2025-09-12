'use client'

import { useState } from 'react'

export default function SettingsTestPage() {
    const [testResult, setTestResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    async function runSettingsTest() {
        try {
            setLoading(true)
            const response = await fetch('/api/debug/settings-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await response.json()
            setTestResult(data)
        } catch (error: any) {
            setTestResult({
                error: 'Failed to run test',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }

    async function testRealUpdate() {
        try {
            setLoading(true)
            const response = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: 'Тест',
                    last_name: 'Обновления'
                })
            })
            const data = await response.json()
            setTestResult({
                step: 'real_update_test',
                success: response.ok,
                status: response.status,
                data: data,
                timestamp: new Date().toISOString()
            })
        } catch (error: any) {
            setTestResult({
                step: 'real_update_test',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Тест настроек</h1>

                    <div className="space-y-4 mb-6">
                        <button
                            onClick={runSettingsTest}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Тестирование...' : '🔍 Тест RLS и доступа'}
                        </button>

                        <button
                            onClick={testRealUpdate}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-4"
                        >
                            {loading ? 'Тестирование...' : '💾 Тест реального обновления'}
                        </button>
                    </div>

                    {testResult && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Результат теста</h3>
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {JSON.stringify(testResult, null, 2)}
                                </pre>
                            </div>

                            {testResult.step === 'complete' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                        <h4 className={`font-semibold mb-2 ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                            Общий результат
                                        </h4>
                                        <div className={`text-lg font-bold ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                            {testResult.success ? '✅ Успешно' : '❌ Ошибка'}
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-lg ${testResult.rls_check?.can_update ? 'bg-green-50' : 'bg-red-50'}`}>
                                        <h4 className={`font-semibold mb-2 ${testResult.rls_check?.can_update ? 'text-green-900' : 'text-red-900'}`}>
                                            RLS UPDATE
                                        </h4>
                                        <div className={`text-lg font-bold ${testResult.rls_check?.can_update ? 'text-green-600' : 'text-red-600'}`}>
                                            {testResult.rls_check?.can_update ? '✅ Разрешен' : '❌ Заблокирован'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {testResult.step === 'real_update_test' && (
                                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <h4 className={`font-semibold mb-2 ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                        Реальное обновление
                                    </h4>
                                    <div className={`text-lg font-bold ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                        {testResult.success ? '✅ Успешно' : `❌ Ошибка (${testResult.status})`}
                                    </div>
                                    {!testResult.success && testResult.data?.error && (
                                        <div className="mt-2 text-red-700">
                                            <strong>Ошибка:</strong> {testResult.data.error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex space-x-3">
                        <a
                            href="/dashboard/settings"
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            🔙 К настройкам
                        </a>
                        <a
                            href="/debug/auth-check"
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                            🔍 Общая диагностика
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
