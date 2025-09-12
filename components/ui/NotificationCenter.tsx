'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from './Toast'
import {
    BellIcon,
    EnvelopeIcon,
    XMarkIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline'
import {
    BellIcon as BellSolidIcon,
    EnvelopeIcon as EnvelopeSolidIcon
} from '@heroicons/react/24/solid'

interface Notification {
    id: string
    type: string
    priority: 'low' | 'normal' | 'high' | 'urgent'
    title: string
    message: string
    metadata?: any
    action_url?: string
    is_read: boolean
    read_at?: string
    show_sound: boolean
    show_popup: boolean
    created_at: string
    expires_at: string
    sender?: {
        id: string
        name: string
        email: string
        role: string
    }
}

interface NotificationCenterProps {
    className?: string
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
    const { addToast } = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)

    // Звуковые частоты для разных приоритетов
    const soundFrequencies = {
        low: 400,      // Низкий тон
        normal: 600,   // Средний тон
        high: 800,     // Высокий тон
        urgent: 1000   // Очень высокий тон
    }

    // Загрузка уведомлений
    const fetchNotifications = async (offset = 0, limit = 20) => {
        try {
            setLoading(true)
            const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`)
            const data = await response.json()

            if (data.success) {
                if (offset === 0) {
                    setNotifications(data.notifications)
                } else {
                    setNotifications(prev => [...prev, ...data.notifications])
                }
                setUnreadCount(data.unread_count)
                setHasMore(data.pagination.has_more)
            } else {
                console.error('Failed to fetch notifications:', data.error)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    // Отметить уведомления как прочитанные
    const markAsRead = async (notificationIds?: string[], markAll = false) => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notification_ids: notificationIds,
                    mark_all: markAll
                })
            })

            const data = await response.json()
            if (data.success) {
                // Обновляем локальное состояние
                if (markAll) {
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
                    setUnreadCount(0)
                } else if (notificationIds) {
                    setNotifications(prev => prev.map(n => 
                        notificationIds.includes(n.id) 
                            ? { ...n, is_read: true, read_at: new Date().toISOString() }
                            : n
                    ))
                    setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
                }
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error)
        }
    }

    // Воспроизведение звука с помощью Web Audio API
    const playNotificationSound = (priority: string) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const frequency = soundFrequencies[priority as keyof typeof soundFrequencies] || soundFrequencies.normal
            
            // Создаем осциллятор
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            
            // Настраиваем звук
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
            oscillator.type = 'sine'
            
            // Настраиваем громкость с плавным затуханием
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            
            // Воспроизводим звук
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.3)
            
            // Для urgent приоритета добавляем второй тон
            if (priority === 'urgent') {
                setTimeout(() => {
                    const oscillator2 = audioContext.createOscillator()
                    const gainNode2 = audioContext.createGain()
                    
                    oscillator2.connect(gainNode2)
                    gainNode2.connect(audioContext.destination)
                    
                    oscillator2.frequency.setValueAtTime(frequency * 1.2, audioContext.currentTime)
                    oscillator2.type = 'sine'
                    
                    gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime)
                    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
                    
                    oscillator2.start(audioContext.currentTime)
                    oscillator2.stop(audioContext.currentTime + 0.3)
                }, 150)
            }
        } catch (error) {
            console.log('Could not play notification sound:', error)
        }
    }

    // Показать всплывающее уведомление
    const showPopupNotification = (notification: Notification) => {
        if (!notification.show_popup) return

        const priorityColors = {
            low: 'info',
            normal: 'info',
            high: 'warning',
            urgent: 'error'
        }

        addToast({
            type: priorityColors[notification.priority] as any,
            title: notification.title,
            description: notification.message,
            duration: notification.priority === 'urgent' ? 10000 : 5000
        })
    }

    // Обработка клика по уведомлению
    const handleNotificationClick = (notification: Notification) => {
        // Отмечаем как прочитанное
        if (!notification.is_read) {
            markAsRead([notification.id])
        }

        // Переходим по ссылке если есть
        if (notification.action_url) {
            window.location.href = notification.action_url
        }

        setIsOpen(false)
    }

    // Получение иконки по типу уведомления
    const getNotificationIcon = (type: string, priority: string) => {
        const iconClass = `h-5 w-5 ${
            priority === 'urgent' ? 'text-red-500' :
            priority === 'high' ? 'text-orange-500' :
            priority === 'normal' ? 'text-blue-500' :
            'text-gray-500'
        }`

        switch (type) {
            case 'withdrawal_pending':
            case 'withdrawal_approved':
            case 'withdrawal_blocked':
                return <ClockIcon className={iconClass} />
            case 'system_alert':
                return priority === 'urgent' ? 
                    <ExclamationTriangleIcon className={iconClass} /> :
                    <InformationCircleIcon className={iconClass} />
            default:
                return <BellIcon className={iconClass} />
        }
    }

    // Форматирование времени
    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffMins < 1) return 'Только что'
        if (diffMins < 60) return `${diffMins} мин назад`
        if (diffHours < 24) return `${diffHours} ч назад`
        if (diffDays < 7) return `${diffDays} дн назад`
        return date.toLocaleDateString('ru-RU')
    }

    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Загрузка уведомлений при монтировании
    useEffect(() => {
        fetchNotifications()
        
        // Периодическое обновление каждые 30 секунд
        const interval = setInterval(() => {
            fetchNotifications()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    // Симуляция получения нового уведомления (для демонстрации)
    useEffect(() => {
        // В реальном приложении здесь будет WebSocket или Server-Sent Events
        const simulateNewNotification = () => {
            const newNotification: Notification = {
                id: Date.now().toString(),
                type: 'system_alert',
                priority: 'normal',
                title: 'Тестовое уведомление',
                message: 'Это тестовое уведомление для демонстрации системы.',
                is_read: false,
                show_sound: true,
                show_popup: true,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }

            // Добавляем в список
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)

            // Воспроизводим звук и показываем всплывающее уведомление
            if (newNotification.show_sound) {
                playNotificationSound(newNotification.priority)
            }
            showPopupNotification(newNotification)
        }

        // Симулируем новое уведомление через 5 секунд после загрузки (только для демо)
        // const timeout = setTimeout(simulateNewNotification, 5000)
        // return () => clearTimeout(timeout)
    }, [])

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Аудио элемент для звуков */}
            <audio ref={audioRef} preload="none" />

            {/* Кнопка уведомлений */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Уведомления"
            >
                {unreadCount > 0 ? (
                    <EnvelopeSolidIcon className="h-6 w-6 text-blue-600" />
                ) : (
                    <EnvelopeIcon className="h-6 w-6" />
                )}
                
                {/* Счетчик непрочитанных */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Выпадающее меню уведомлений */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                    {/* Заголовок */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Уведомления
                            {unreadCount > 0 && (
                                <span className="ml-2 text-sm text-gray-500">
                                    ({unreadCount} новых)
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAsRead(undefined, true)}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                    title="Отметить все как прочитанные"
                                >
                                    <CheckIcon className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Список уведомлений */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                Загрузка уведомлений...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <EnvelopeIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                <p>Нет уведомлений</p>
                            </div>
                        ) : (
                            <>
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type, notification.priority)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <h4 className={`text-sm font-medium ${
                                                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                                    }`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                {notification.sender && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        От: {notification.sender.name || notification.sender.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Кнопка "Загрузить еще" */}
                                {hasMore && (
                                    <div className="p-4 text-center border-t border-gray-200">
                                        <button
                                            onClick={() => fetchNotifications(notifications.length)}
                                            disabled={loading}
                                            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                                        >
                                            {loading ? 'Загрузка...' : 'Загрузить еще'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
