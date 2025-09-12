'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    PlayIcon,
    ClipboardDocumentListIcon,
    BuildingLibraryIcon,
    CreditCardIcon
} from '@heroicons/react/24/outline'

interface GeneratedAccount {
    username: string
    password: string
    email: string
    phoneNumber: string
}

interface ToolSection {
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    href?: string
    action?: () => void
    color: string
}

export default function TeamLeadToolsPage() {
    const router = useRouter()
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState<'generator' | 'formatter'>('generator')

    // Генератор британских аккаунтов
    const [count, setCount] = useState<number>(10)
    const [customNames, setCustomNames] = useState<string>('')
    const [generatedData, setGeneratedData] = useState<GeneratedAccount[]>([])
    const [generating, setGenerating] = useState(false)

    // Форматирование текста (только нижний регистр)
    const [inputText, setInputText] = useState('')
    const [outputText, setOutputText] = useState('')
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
        '075', '079',
        // Virgin Mobile
        '077', '078',
        // giffgaff
        '074', '075'
    ]

    // Британские имена и фамилии
    const britishFirstNames = [
        'James', 'Oliver', 'William', 'Henry', 'George', 'Charlie', 'Jack', 'Jacob', 'Edward', 'Thomas',
        'Emily', 'Olivia', 'Amelia', 'Isla', 'Ava', 'Grace', 'Sophia', 'Charlotte', 'Mia', 'Isabella',
        'Alexander', 'Benjamin', 'Sebastian', 'Theodore', 'Lucas', 'Arthur', 'Oscar', 'Leo', 'Noah', 'Harry',
        'Lily', 'Freya', 'Ella', 'Rosie', 'Evie', 'Florence', 'Poppy', 'Ivy', 'Willow', 'Elsie'
    ]

    const britishLastNames = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
        'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
        'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
        'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
        'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
    ]

    // Функция генерации британского номера телефона
    const generateUKPhoneNumber = (): string => {
        const prefix = ukMobilePrefixes[Math.floor(Math.random() * ukMobilePrefixes.length)]
        const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
        return `+44${prefix}${remaining}`
    }

    // Функция генерации email
    const generateEmail = (firstName: string, lastName: string): string => {
        const domains = ['gmail.com', 'yahoo.co.uk', 'outlook.com', 'hotmail.co.uk', 'btinternet.com']
        const domain = domains[Math.floor(Math.random() * domains.length)]
        const randomNum = Math.floor(Math.random() * 999) + 1

        const emailVariations = [
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}@${domain}`,
            `${firstName.toLowerCase()}${randomNum}@${domain}`,
            `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}${randomNum}@${domain}`
        ]

        return emailVariations[Math.floor(Math.random() * emailVariations.length)]
    }

    // Функция генерации пароля
    const generatePassword = (): string => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const lowercase = 'abcdefghijklmnopqrstuvwxyz'
        const numbers = '0123456789'
        const symbols = '!@#$%^&*'

        const allChars = uppercase + lowercase + numbers + symbols
        let password = ''

        // Обеспечиваем наличие хотя бы одного символа каждого типа
        password += uppercase[Math.floor(Math.random() * uppercase.length)]
        password += lowercase[Math.floor(Math.random() * lowercase.length)]
        password += numbers[Math.floor(Math.random() * numbers.length)]
        password += symbols[Math.floor(Math.random() * symbols.length)]

        // Добавляем остальные символы
        for (let i = 4; i < 12; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)]
        }

        // Перемешиваем пароль
        return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    // Функция генерации username
    const generateUsername = (firstName: string, lastName: string): string => {
        const randomNum = Math.floor(Math.random() * 9999) + 1
        const usernameVariations = [
            `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}`,
            `${firstName.toLowerCase()}${randomNum}`,
            `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}${randomNum}`,
            `${lastName.toLowerCase()}${firstName.charAt(0).toLowerCase()}${randomNum}`
        ]

        return usernameVariations[Math.floor(Math.random() * usernameVariations.length)]
    }

    // Основная функция генерации аккаунтов
    const generateAccounts = async () => {
        setGenerating(true)

        try {
            const accounts: GeneratedAccount[] = []
            const names = customNames.trim() ? customNames.split('\n').filter(name => name.trim()) : []

            for (let i = 0; i < count; i++) {
                let firstName: string, lastName: string

                if (names.length > 0 && i < names.length) {
                    const fullName = names[i].trim().split(' ')
                    firstName = fullName[0] || britishFirstNames[Math.floor(Math.random() * britishFirstNames.length)]
                    lastName = fullName[1] || britishLastNames[Math.floor(Math.random() * britishLastNames.length)]
                } else {
                    firstName = britishFirstNames[Math.floor(Math.random() * britishFirstNames.length)]
                    lastName = britishLastNames[Math.floor(Math.random() * britishLastNames.length)]
                }

                accounts.push({
                    username: generateUsername(firstName, lastName),
                    password: generatePassword(),
                    email: generateEmail(firstName, lastName),
                    phoneNumber: generateUKPhoneNumber()
                })
            }

            setGeneratedData(accounts)
            addToast({
                type: 'success',
                title: 'Аккаунты сгенерированы',
                description: `Создано ${accounts.length} британских аккаунтов`
            })

        } catch (error) {
            addToast({
                type: 'error',
                title: 'Ошибка генерации',
                description: 'Не удалось сгенерировать аккаунты'
            })
        } finally {
            setGenerating(false)
        }
    }

    // Функция копирования в буфер обмена
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast({
                type: 'success',
                title: 'Скопировано',
                description: `${label} скопирован в буфер обмена`
            })
        })
    }

    // Функция копирования всех данных
    const copyAllData = () => {
        if (generatedData.length === 0) return

        const formatted = generatedData.map(account =>
            `Username: ${account.username}\nPassword: ${account.password}\nEmail: ${account.email}\nPhone: ${account.phoneNumber}\n---`
        ).join('\n')

        copyToClipboard(formatted, 'Все данные')
    }

    // Функция очистки данных
    const clearData = () => {
        setGeneratedData([])
        setCustomNames('')
        addToast({
            type: 'success',
            title: 'Данные очищены',
            description: 'Все сгенерированные данные удалены'
        })
    }

    // Функция форматирования в нижний регистр
    const formatToLowercase = () => {
        setFormatting(true)
        setTimeout(() => {
            setOutputText(inputText.toLowerCase())
            setFormatting(false)
            addToast({
                type: 'success',
                title: 'Текст отформатирован',
                description: 'Преобразование в нижний регистр завершено'
            })
        }, 500)
    }

    const toolSections: ToolSection[] = [
        {
            title: 'Управление задачами',
            description: 'Создание и делегирование задач Junior\'ам',
            icon: ClipboardDocumentListIcon,
            href: '/dashboard/teamlead/tasks',
            color: 'bg-blue-50 border-blue-200 text-blue-700'
        },
        {
            title: 'Kanban доска',
            description: 'Визуальное управление задачами команды',
            icon: ClipboardDocumentListIcon,
            href: '/dashboard/teamlead/kanban',
            color: 'bg-green-50 border-green-200 text-green-700'
        },
        {
            title: 'PayPal команды',
            description: 'Управление PayPal аккаунтами Junior\'ов',
            icon: CreditCardIcon,
            href: '/dashboard/teamlead/paypal',
            color: 'bg-purple-50 border-purple-200 text-purple-700'
        },
        {
            title: 'Мои назначения',
            description: 'Просмотр назначенных ресурсов и казино',
            icon: BuildingLibraryIcon,
            href: '/dashboard/teamlead/assignments',
            color: 'bg-orange-50 border-orange-200 text-orange-700'
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <WrenchScrewdriverIcon className="h-8 w-8 text-gray-700" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Инструменты TeamLead</h1>
                    <p className="text-gray-600">Генератор данных, управление задачами и ресурсами</p>
                </div>
            </div>

            {/* Переключатель табов */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('generator')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'generator'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <CommandLineIcon className="h-4 w-4 inline mr-2" />
                    Генератор аккаунтов
                </button>
                <button
                    onClick={() => setActiveTab('formatter')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'formatter'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <DocumentTextIcon className="h-4 w-4 inline mr-2" />
                    Форматирование
                </button>
            </div>

            {/* Генератор британских аккаунтов */}
            {activeTab === 'generator' && (
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CommandLineIcon className="h-5 w-5" />
                            Генератор британских аккаунтов
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Настройки */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Количество аккаунтов
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={count}
                                        onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Пользовательские имена (опционально)
                                    </label>
                                    <textarea
                                        value={customNames}
                                        onChange={(e) => setCustomNames(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Введите имена (по одному на строку)&#10;Например:&#10;John Smith&#10;Jane Doe"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Если не указано, будут использованы случайные британские имена
                                    </p>
                                </div>

                                <button
                                    onClick={generateAccounts}
                                    disabled={generating}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {generating ? (
                                        <>
                                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                            Генерация...
                                        </>
                                    ) : (
                                        <>
                                            <PlayIcon className="h-4 w-4" />
                                            Сгенерировать аккаунты
                                        </>
                                    )}
                                </button>

                                {generatedData.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={copyAllData}
                                            className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                        >
                                            <DocumentDuplicateIcon className="h-4 w-4" />
                                            Копировать все
                                        </button>
                                        <button
                                            onClick={clearData}
                                            className="btn-danger flex items-center justify-center gap-2 px-3"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Результаты */}
                            <div className="lg:col-span-2">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Сгенерированные аккаунты ({generatedData.length})
                                    </label>
                                </div>

                                {generatedData.length === 0 ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                                        <CommandLineIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                        <p>Нажмите "Сгенерировать аккаунты" для создания данных</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                                        {generatedData.map((account, index) => (
                                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-700">Username:</span>
                                                            <button
                                                                onClick={() => copyToClipboard(account.username, 'Username')}
                                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                            >
                                                                <span className="font-mono">{account.username}</span>
                                                                <ClipboardDocumentIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-700">Password:</span>
                                                            <button
                                                                onClick={() => copyToClipboard(account.password, 'Password')}
                                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                            >
                                                                <span className="font-mono">{account.password}</span>
                                                                <ClipboardDocumentIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-700">Email:</span>
                                                            <button
                                                                onClick={() => copyToClipboard(account.email, 'Email')}
                                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                            >
                                                                <span className="font-mono">{account.email}</span>
                                                                <ClipboardDocumentIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-700">Phone:</span>
                                                            <button
                                                                onClick={() => copyToClipboard(account.phoneNumber, 'Phone')}
                                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                            >
                                                                <span className="font-mono">{account.phoneNumber}</span>
                                                                <ClipboardDocumentIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Форматирование текста */}
            {activeTab === 'formatter' && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5" />
                        Форматирование текста
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Исходный текст
                            </label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Введите текст для преобразования в нижний регистр..."
                            />
                            <button
                                onClick={formatToLowercase}
                                disabled={formatting || !inputText.trim()}
                                className="btn-primary mt-3 w-full flex items-center justify-center gap-2"
                            >
                                {formatting ? (
                                    <>
                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                        Форматирование...
                                    </>
                                ) : (
                                    <>
                                        <TableCellsIcon className="h-4 w-4" />
                                        Преобразовать в нижний регистр
                                    </>
                                )}
                            </button>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Результат
                                </label>
                                {outputText && (
                                    <button
                                        onClick={() => copyToClipboard(outputText, 'Отформатированный текст')}
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                    >
                                        <ClipboardDocumentIcon className="h-4 w-4" />
                                        Копировать
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={outputText}
                                readOnly
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                placeholder="Отформатированный текст появится здесь..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Дополнительные инструменты */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {toolSections.map((section) => (
                    <div
                        key={section.href || section.title}
                        onClick={() => section.href && router.push(section.href)}
                        className={`${section.color} border rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105`}
                    >
                        <div className="flex items-start gap-4">
                            <section.icon className="h-8 w-8 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                                <p className="text-sm opacity-80">{section.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Информация */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🛠️ Возможности TeamLead</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                        <h4 className="font-medium mb-2">⚡ Генерация данных:</h4>
                        <ul className="space-y-1 text-xs">
                            <li>• Британские имена пользователей</li>
                            <li>• Безопасные пароли</li>
                            <li>• UK Email адреса</li>
                            <li>• Британские номера телефонов</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">📝 Управление командой:</h4>
                        <ul className="space-y-1 text-xs">
                            <li>• Создание и делегирование задач</li>
                            <li>• Kanban доска для визуализации</li>
                            <li>• Управление PayPal аккаунтами</li>
                            <li>• Контроль назначений</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}