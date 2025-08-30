import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Afflsor ERP System',
  description: 'Комплексная ERP система для управления бизнес-процессами',
  keywords: ['ERP', 'CRM', 'управление', 'бизнес', 'автоматизация'],
  authors: [{ name: 'Afflsor Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <ToastProvider>
          <div id="root" className="min-h-full">
            {children}
          </div>
          
          {/* Portal для модальных окон */}
          <div id="modal-root"></div>
          
          {/* Portal для уведомлений */}
          <div id="toast-root"></div>
        </ToastProvider>
      </body>
    </html>
  )
}
