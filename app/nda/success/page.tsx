'use client'

import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function NDASuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <CheckCircleIcon className="w-16 h-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            NDA успешно подписано!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Ваше соглашение о неразглашении было успешно подписано и отправлено на рассмотрение. 
            Все загруженные документы сохранены в системе.
          </p>
          
          <div className="space-y-3 text-sm text-gray-500">
            <p>✓ Персональные данные сохранены</p>
            <p>✓ Документы загружены</p>
            <p>✓ NDA подписано</p>
          </div>
          
          <div className="mt-8">
            <p className="text-xs text-gray-400">
              Если у вас есть вопросы, обратитесь к HR отделу
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
