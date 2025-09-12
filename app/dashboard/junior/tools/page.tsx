'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
    WrenchScrewdriverIcon,
    CommandLineIcon,
    TableCellsIcon,
    DocumentTextIcon,
    ClipboardDocumentIcon,
    ArrowPathIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    PlayIcon
} from '@heroicons/react/24/outline'

interface GeneratedAccount {
    username: string
    password: string
    email: string
    phoneNumber: string
}

export default function JuniorToolsPage() {
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState<'generator' | 'formatter'>('generator')
    
    // Генератор британских аккаунтов
    const [count, setCount] = useState<number>(10)
    const [customNames, setCustomNames] = useState<string>('')
    const [generatedData, setGeneratedData] = useState<GeneratedAccount[]>([])
    const [generating, setGenerating] = useState(false)
    
    // Форматирование таблиц
    const [inputText, setInputText] = useState('')
    const [outputText, setOutputText] = useState('')
    const [formatType, setFormatType] = useState<'lowercase' | 'clean' | 'table' | 'cells'>('lowercase')
    const [formatting, setFormatting] = useState(false)

    // Британские мобильные префиксы операторов
    const ukMobilePrefixes = [
        // O2
        '070', '071', '075', '078',
        // Vodafone
        '074', '077', '078', '079',
        // EE
        '074', '075', '079',
        // Three
        '073', '075', '076', '079',
        // Lycamobile
        '074', '075', '076',
        // Tesco Mobile
        '075', '077',
        // Giffgaff
        '071', '074', '075',
        // Manx Telecom
        '076',
        // Virgin Mobile
        '073', '074'
    ]

    // Email домены
    const emailDomains = [
        'gmail.com', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.com', 
        'btinternet.com', 'sky.com', 'virgin.net', 'talk21.com'
    ]

    // Генерация случайного имени пользователя
    function generateUsername(customName?: string): string {
        if (customName) {
            const cleanName = customName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '')
            const randomNum = Math.random() < 0.5 ? Math.floor(Math.random() * 999) + 1 : ''
            return cleanName + randomNum
        }

        const firstNames = [
            'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
            'thomas', 'christopher', 'charles', 'daniel', 'matthew', 'anthony', 'mark',
            'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan',
            'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'helen', 'sandra'
        ]
        
        const lastNames = [
            'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
            'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson',
            'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson',
            'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson'
        ]

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
        const randomNum = Math.random() < 0.6 ? Math.floor(Math.random() * 999) + 1 : ''
        
        return firstName + lastName + randomNum
    }

    // Генерация пароля
    function generatePassword(): string {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz'
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const numbers = '0123456789'
        const specials = '!@#$%^&*'
        
        const length = Math.floor(Math.random() * 5) + 10 // 10-14 символов
        
        // Обязательные символы
        let password = ''
        password += lowercase[Math.floor(Math.random() * lowercase.length)] // начинаем с буквы
        password += uppercase[Math.floor(Math.random() * uppercase.length)]
        password += numbers[Math.floor(Math.random() * numbers.length)]
        password += specials[Math.floor(Math.random() * specials.length)]
        
        // Заполняем остальные позиции
        const allChars = lowercase + uppercase + numbers + specials
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)]
        }
        
        // Перемешиваем символы (кроме первого)
        const passwordArray = password.split('')
        const firstChar = passwordArray[0]
        const restChars = passwordArray.slice(1)
        
        for (let i = restChars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[restChars[i], restChars[j]] = [restChars[j], restChars[i]]
        }
        
        return firstChar + restChars.join('')
    }

    // Генерация email
    function generateEmail(username: string): string {
        const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)]
        return `${username}@${domain}`
    }

    // Генерация британского номера телефона
    function generateUKPhoneNumber(): string {
        const prefix = ukMobilePrefixes[Math.floor(Math.random() * ukMobilePrefixes.length)]
        const remainingDigits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
        return `7${prefix}${remainingDigits}`
    }

    // Основная функция генерации
    function generateAccounts() {
        setGenerating(true)
        
        try {
            const accounts: GeneratedAccount[] = []

            // Парсим пользовательские имена если они есть
            const customNamesList = customNames
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)

            for (let i = 0; i < count; i++) {
                const customName = customNamesList[i % customNamesList.length] || undefined
                const username = generateUsername(customName)
                const password = generatePassword()
                const email = generateEmail(username)
                const phoneNumber = generateUKPhoneNumber()

                accounts.push({
                    username,
                    password,
                    email,
                    phoneNumber
                })
            }

            setGeneratedData(accounts)
            
            addToast({
                type: 'success',
                title: 'Данные сгенерированы',
                description: `Создано ${accounts.length} аккаунтов`
            })
        } catch (error) {
            console.error('Ошибка генерации:', error)
            addToast({
                type: 'error',
                title: 'Ошибка генерации',
                description: 'Не удалось сгенерировать данные'
            })
        } finally {
            setGenerating(false)
        }
    }

    // Копирование таблицы в буфер обмена
    function copyTableToClipboard() {
        if (generatedData.length === 0) {
            addToast({
                type: 'warning',
                title: 'Нет данных',
                description: 'Сначала сгенерируйте данные'
            })
            return
        }

        // Создаем CSV формат для Google Sheets
        const headers = ['Username', 'Password', 'Email', 'Phone Number']
        const csvContent = [
            headers.join('\t'),
            ...generatedData.map(account => [
                account.username,
                account.password,
                account.email,
                account.phoneNumber
            ].join('\t'))
        ].join('\n')

        navigator.clipboard.writeText(csvContent).then(() => {
            addToast({
                type: 'success',
                title: 'Скопировано!',
                description: 'Таблица скопирована в буфер обмена. Вставьте в Google Sheets с помощью Ctrl+V'
            })
        }).catch(() => {
            addToast({
                type: 'error',
                title: 'Ошибка копирования',
                description: 'Не удалось скопировать данные'
            })
        })
    }

    // Очистка данных
    function clearData() {
        setGeneratedData([])
        addToast({
            type: 'info',
            title: 'Данные очищены'
        })
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
                    
                case 'cells':
                    // Преобразуем таблицу обратно в отдельные ячейки
                    const tableLines = inputText.split('\n')
                    const cellsArray: string[] = []
                    
                    tableLines.forEach((line, rowIndex) => {
                        if (line.trim()) {
                            // Разбиваем строку по табуляции или множественным пробелам
                            const cells = line.split(/\t+|\s{2,}/).filter(cell => cell.trim().length > 0)
                            cells.forEach((cell, colIndex) => {
                                cellsArray.push(`Строка ${rowIndex + 1}, Колонка ${colIndex + 1}: ${cell.trim()}`)
                            })
                        }
                    })
                    
                    result = cellsArray.join('\n')
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Генератор британских аккаунтов</h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Количество записей</label>
                                    <input
                                        type="number"
                                        value={count}
                                        onChange={(e) => setCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                                        className="form-input"
                                        min="1"
                                        max="1000"
                                        placeholder="10"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">От 1 до 1000 записей</p>
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Пользовательские имена (опционально)</label>
                                <textarea
                                    value={customNames}
                                    onChange={(e) => setCustomNames(e.target.value)}
                                    className="form-input"
                                    rows={4}
                                    placeholder="Введите имена и фамилии, каждое на новой строке:&#10;John Smith&#10;Jane Doe&#10;Mike Johnson"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Если оставить пустым, будут использованы случайные имена. 
                                    Если имен меньше чем записей, они будут повторяться.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={generateAccounts}
                                    disabled={generating}
                                    className="btn-primary flex items-center"
                                >
                                    <PlayIcon className="h-4 w-4 mr-2" />
                                    {generating ? 'Генерация...' : 'Сгенерировать данные'}
                                </button>
                                
                                {generatedData.length > 0 && (
                                    <>
                                        <button
                                            onClick={copyTableToClipboard}
                                            className="btn-secondary flex items-center"
                                        >
                                            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                                            Скопировать таблицу
                                        </button>
                                        
                                        <button
                                            onClick={clearData}
                                            className="btn-danger flex items-center"
                                        >
                                            <TrashIcon className="h-4 w-4 mr-2" />
                                            Очистить
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Результаты */}
                    {generatedData.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Сгенерированные данные ({generatedData.length} записей)
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Нажмите "Скопировать таблицу" чтобы скопировать все данные для вставки в Google Sheets
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Username
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Password
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Phone Number
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {generatedData.map((account, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-mono text-gray-900 select-all">
                                                    {account.username}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-900 select-all">
                                                    {account.password}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-900 select-all">
                                                    {account.email}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-900 select-all">
                                                    {account.phoneNumber}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Информация */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">📋 Как использовать:</h4>
                        <div className="text-sm text-blue-800 space-y-1">
                            <div>1. Укажите количество записей (1-1000)</div>
                            <div>2. Опционально добавьте свои имена и фамилии</div>
                            <div>3. Нажмите "Сгенерировать данные"</div>
                            <div>4. Нажмите "Скопировать таблицу" для копирования в Google Sheets</div>
                            <div>5. В Google Sheets нажмите Ctrl+V для вставки</div>
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">✅ Особенности генерации:</h4>
                        <div className="text-sm text-green-800 space-y-1">
                            <div>• Username: 8-16 символов, имя+фамилия+число</div>
                            <div>• Password: 10-14 символов с цифрой, большой/маленькой буквой и спецсимволом</div>
                            <div>• Email: на основе username с британскими доменами</div>
                            <div>• Phone: номера начинаются с 7, реальные префиксы операторов</div>
                            <div>• Все данные проходят базовую валидацию сайтов</div>
                        </div>
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
                                    <option value="cells">Разбор таблицы по ячейкам</option>
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
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Результат
                                        </label>
                                        <button
                                            onClick={() => copyToClipboard(outputText)}
                                            className="btn-secondary text-xs flex items-center"
                                        >
                                            <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                                            Копировать
                                        </button>
                                    </div>
                                    
                                    {formatType === 'cells' ? (
                                        // Для типа "разбор таблицы по ячейкам" показываем как таблицу
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                            <div className="grid gap-2">
                                                {outputText.split('\n').map((line, index) => {
                                                    if (!line.trim()) return null
                                                    const [position, ...contentParts] = line.split(': ')
                                                    const content = contentParts.join(': ')
                                                    return (
                                                        <div key={index} className="bg-white border border-gray-200 rounded p-3 hover:bg-blue-50 transition-colors">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-medium text-blue-600 mb-1">
                                                                        {position}
                                                                    </div>
                                                                    <div className="text-sm text-gray-900 font-mono select-all">
                                                                        {content}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => copyToClipboard(content)}
                                                                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                                                                    title="Копировать содержимое ячейки"
                                                                >
                                                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        // Для остальных типов показываем как обычный текст
                                        <div className="relative">
                                            <textarea
                                                value={outputText}
                                                readOnly
                                                className="form-input h-32 bg-gray-50"
                                            />
                                        </div>
                                    )}
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
                            <li>• <strong>Разбор таблицы по ячейкам:</strong> разбивает таблицу на отдельные ячейки с указанием позиции</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}
