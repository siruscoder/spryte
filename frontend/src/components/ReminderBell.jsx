import { useState, useRef, useEffect } from 'react'
import { Bell, Check, X, Clock, FileText, ExternalLink } from 'lucide-react'
import { useReminderStore } from '../stores'
import { remindersApi } from '../api'

/**
 * ReminderBell - Bell icon in the header that shows active reminders
 * 
 * Features:
 * - Rings (animates) when a new reminder triggers
 * - Shows badge with count of active notifications
 * - Dropdown shows all active reminders with context
 * - Can mark as done or dismiss from dropdown
 */
export default function ReminderBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { activeNotifications, isRinging, removeNotification } = useReminderStore()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Mark reminder as complete
  const handleComplete = async (reminderId) => {
    try {
      await remindersApi.complete(reminderId)
    } catch (err) {
      console.error('Failed to complete reminder:', err)
    }
    removeNotification(reminderId)
  }

  // Dismiss reminder (just remove from UI)
  const handleDismiss = (reminderId) => {
    removeNotification(reminderId)
  }

  const hasNotifications = activeNotifications.length > 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          hasNotifications 
            ? 'hover:bg-amber-50 text-amber-600' 
            : 'hover:bg-gray-100 text-gray-500'
        }`}
      >
        <Bell 
          className={`w-5 h-5 ${isRinging ? 'animate-ring' : ''}`} 
          fill={hasNotifications ? 'currentColor' : 'none'}
        />
        
        {/* Notification badge */}
        {hasNotifications && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {activeNotifications.length > 9 ? '9+' : activeNotifications.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800">Reminders</span>
              </div>
              {hasNotifications && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {activeNotifications.length} active
                </span>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {activeNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active reminders</p>
                <p className="text-xs text-gray-400 mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Message */}
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {notification.message}
                    </p>

                    {/* Due date */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        Due: {new Date(notification.due_date).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Context - Note info if available */}
                    {notification.note_id && (
                      <div className="flex items-center gap-1.5 text-xs text-primary-600 mb-3">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">
                          In note: {notification.note_title || 'View note'}
                        </span>
                        <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                      </div>
                    )}

                    {/* Early reminder indicator */}
                    {notification.early_reminder_minutes > 0 && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-3 inline-block">
                        ⏰ Early reminder ({notification.early_reminder_minutes} min before)
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComplete(notification.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Done
                      </button>
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
