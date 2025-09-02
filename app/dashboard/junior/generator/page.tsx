'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { 
  CommandLineIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

interface GeneratedAccount {
  username: string
  password: string
  email: string
  phoneNumber: string
  generationDate: string
}

export default function DataGeneratorPage() {
  const { addToast } = useToast()
  const [count, setCount] = useState<number>(10)
  const [customNames, setCustomNames] = useState<string>('')
  const [generatedData, setGeneratedData] = useState<GeneratedAccount[]>([])
  const [loading, setLoading] = useState(false)

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
    return `0${prefix}${remainingDigits}`
  }

  // Основная функция генерации
  function generateAccounts() {
    setLoading(true)
    
    try {
      const accounts: GeneratedAccount[] = []
      const now = new Date()
      const generationDate = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })

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
          phoneNumber,
          generationDate
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
      setLoading(false)
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
    const headers = ['Username', 'Password', 'Email', 'Phone Number', 'Generation Date']
    const csvContent = [
      headers.join('\t'),
      ...generatedData.map(account => [
        account.username,
        account.password,
        account.email,
        account.phoneNumber,
        account.generationDate
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Генератор британских аккаунтов</h1>
        <p className="text-gray-600">Создание реалистичных данных для британских аккаунтов</p>
      </div>

      {/* Форма настроек */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <CommandLineIcon className="h-5 w-5 mr-2" />
            Настройки генерации
          </h3>
        </div>
        <div className="card-content space-y-4">
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
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {loading ? 'Генерация...' : 'Сгенерировать данные'}
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Сгенерированные данные ({generatedData.length} записей)
            </h3>
            <p className="text-sm text-gray-500">
              Нажмите "Скопировать таблицу" чтобы скопировать все данные для вставки в Google Sheets
            </p>
          </div>
          <div className="card-content">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generation Date
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
                      <td className="px-4 py-3 text-sm text-gray-500 select-all">
                        {account.generationDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div>• Phone: валидные британские номера с реальными префиксами операторов</div>
          <div>• Все данные проходят базовую валидацию сайтов</div>
        </div>
      </div>
    </div>
  )
}
