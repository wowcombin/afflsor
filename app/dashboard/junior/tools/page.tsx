'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
    WrenchScrewdriverIcon,
    CommandLineIcon,
    TableCellsIcon,
    DocumentTextIcon,
    ClipboardDocumentIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function JuniorToolsPage() {
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState<'generator' | 'formatter'>('generator')
    
    // Генератор данных
    const [generatorType, setGeneratorType] = useState<'person' | 'address' | 'phone' | 'email'>('person')
    const [generatedData, setGeneratedData] = useState('')
    const [generating, setGenerating] = useState(false)
    
    // Форматирование таблиц
    const [inputText, setInputText] = useState('')
    const [outputText, setOutputText] = useState('')
    const [formatType, setFormatType] = useState<'lowercase' | 'clean' | 'table'>('lowercase')
    const [formatting, setFormatting] = useState(false)

    // Генератор данных
    const generateData = async () => {
        setGenerating(true)
        try {
            let result = ''
            
            switch (generatorType) {
                case 'person':
                    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Mark', 'Anna']
                    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
                    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
                    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
                    result = `${firstName} ${lastName}`
                    break
                    
                case 'address':
                    const streets = ['Main St', 'Oak Ave', 'Park Rd', 'First St', 'Second Ave', 'Elm St', 'Maple Ave', 'Cedar Rd']
                    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego']
                    const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA']
                    const streetNum = Math.floor(Math.random() * 9999) + 1
                    const street = streets[Math.floor(Math.random() * streets.length)]
                    const city = cities[Math.floor(Math.random() * cities.length)]
                    const state = states[Math.floor(Math.random() * states.length)]
                    const zip = Math.floor(Math.random() * 90000) + 10000
                    result = `${streetNum} ${street}, ${city}, ${state} ${zip}`
                    break
                    
                case 'phone':
                    const areaCode = Math.floor(Math.random() * 800) + 200
                    const exchange = Math.floor(Math.random() * 800) + 200
                    const number = Math.floor(Math.random() * 9000) + 1000
                    result = `(${areaCode}) ${exchange}-${number}`
                    break
                    
                case 'email':
                    const emailNames = ['user', 'test', 'demo', 'sample', 'example', 'john', 'jane', 'admin']
                    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'test.com']
                    const name = emailNames[Math.floor(Math.random() * emailNames.length)]
                    const domain = domains[Math.floor(Math.random() * domains.length)]
                    const num = Math.floor(Math.random() * 999) + 1
                    result = `${name}${num}@${domain}`
                    break
            }
            
            setGeneratedData(result)
            
            // Копируем в буфер обмена
            await navigator.clipboard.writeText(result)
            addToast({
                type: 'success',
                title: 'Данные сгенерированы',
                description: 'Результат скопирован в буфер обмена'
            })
            
        } catch (error) {
            console.error('Generation error:', error)
            addToast({
                type: 'error',
                title: 'Ошибка генерации',
                description: 'Не удалось сгенерировать данные'
            })
        } finally {
            setGenerating(false)
        }
    }

    // Форматирование текста
    const formatText = async () => {
        if (!inputText.trim()) {
            addToast({
                type: 'warning',
                title: 'Пустой ввод',
                description: 'Введите текст для форматирования'
            })
            return
        }

        setFormatting(true)
        try {
            let result = inputText

            switch (formatType) {
                case 'lowercase':
                    result = inputText.toLowerCase()
                    break
                    
                case 'clean':
                    // Убираем лишние пробелы, переносы строк и специальные символы
                    result = inputText
                        .replace(/\s+/g, ' ') // Множественные пробелы в один
                        .replace(/\n+/g, '\n') // Множественные переносы в один
                        .replace(/[^\w\s\n\t.,!?-]/g, '') // Убираем специальные символы
                        .trim()
                    break
                    
                case 'table':
                    // Форматируем как таблицу (разделители табуляции)
                    const lines = inputText.split('\n')
                    const formattedLines = lines.map(line => {
                        return line
                            .split(/\s+/) // Разбиваем по пробелам
                            .filter(cell => cell.length > 0) // Убираем пустые ячейки
                            .join('\t') // Соединяем табуляцией
                    })
                    result = formattedLines.join('\n')
                    break
            }

            setOutputText(result)
            
            // Копируем в буфер обмена
            await navigator.clipboard.writeText(result)
            addToast({
                type: 'success',
                title: 'Текст отформатирован',
                description: 'Результат скопирован в буфер обмена'
            })
            
        } catch (error) {
            console.error('Formatting error:', error)
            addToast({
                type: 'error',
                title: 'Ошибка форматирования',
                description: 'Не удалось отформатировать текст'
            })
        } finally {
            setFormatting(false)
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            addToast({
                type: 'success',
                title: 'Скопировано',
                description: 'Текст скопирован в буфер обмена'
            })
        } catch (error) {
            addToast({
                type: 'error',
                title: 'Ошибка копирования',
                description: 'Не удалось скопировать текст'
            })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Инструменты</h1>
                    <p className="text-gray-600">Генератор данных и форматирование текста</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('generator')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'generator'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <CommandLineIcon className="h-5 w-5 inline mr-2" />
                        Генератор данных
                    </button>
                    <button
                        onClick={() => setActiveTab('formatter')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'formatter'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <TableCellsIcon className="h-5 w-5 inline mr-2" />
                        Форматирование
                    </button>
                </nav>
            </div>

            {/* Generator Tab */}
            {activeTab === 'generator' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Генератор тестовых данных</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Тип данных
                                </label>
                                <select
                                    value={generatorType}
                                    onChange={(e) => setGeneratorType(e.target.value as any)}
                                    className="form-input"
                                >
                                    <option value="person">Имя и фамилия</option>
                                    <option value="address">Адрес</option>
                                    <option value="phone">Телефон</option>
                                    <option value="email">Email</option>
                                </select>
                            </div>

                            <button
                                onClick={generateData}
                                disabled={generating}
                                className="btn-primary flex items-center"
                            >
                                {generating ? (
                                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CommandLineIcon className="h-4 w-4 mr-2" />
                                )}
                                Сгенерировать
                            </button>

                            {generatedData && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Результат
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={generatedData}
                                            readOnly
                                            className="form-input pr-10 bg-gray-50"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(generatedData)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        >
                                            <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Примеры использования */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">💡 Примеры использования:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• <strong>Имя и фамилия:</strong> для регистрации в казино</li>
                            <li>• <strong>Адрес:</strong> для заполнения профиля</li>
                            <li>• <strong>Телефон:</strong> для верификации аккаунта</li>
                            <li>• <strong>Email:</strong> для создания временных аккаунтов</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Formatter Tab */}
            {activeTab === 'formatter' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Форматирование текста</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Тип форматирования
                                </label>
                                <select
                                    value={formatType}
                                    onChange={(e) => setFormatType(e.target.value as any)}
                                    className="form-input"
                                >
                                    <option value="lowercase">Нижний регистр</option>
                                    <option value="clean">Очистка от стилей</option>
                                    <option value="table">Форматирование таблицы</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Исходный текст
                                </label>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Вставьте текст для форматирования..."
                                    className="form-input h-32"
                                />
                            </div>

                            <button
                                onClick={formatText}
                                disabled={formatting || !inputText.trim()}
                                className="btn-primary flex items-center"
                            >
                                {formatting ? (
                                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                                )}
                                Форматировать
                            </button>

                            {outputText && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Результат
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={outputText}
                                            readOnly
                                            className="form-input h-32 bg-gray-50 pr-10"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(outputText)}
                                            className="absolute top-2 right-2"
                                        >
                                            <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Описание форматирования */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">📋 Типы форматирования:</h4>
                        <ul className="text-sm text-green-800 space-y-1">
                            <li>• <strong>Нижний регистр:</strong> преобразует весь текст в строчные буквы</li>
                            <li>• <strong>Очистка от стилей:</strong> убирает лишние пробелы и специальные символы из Google Таблиц</li>
                            <li>• <strong>Форматирование таблицы:</strong> преобразует данные в табличный формат с разделителями</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}
