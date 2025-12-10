import { useState, useEffect, useRef } from 'react'
import { Bell, X, Loader2, Check, Calendar, Clock } from 'lucide-react'
import { remindersApi } from '../api'
import { useReminderStore } from '../stores'

export default function ReminderDialog({ 
  position, 
  noteId,
  blockId,
  onClose, 
  onSave,
}) {
  const { triggerPoll } = useReminderStore()
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [earlyReminder, setEarlyReminder] = useState('0') // minutes before
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const dialogRef = useRef(null)
  const messageRef = useRef(null)

  // Set default date to today
  useEffect(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setDate(`${yyyy}-${mm}-${dd}`)
  }, [])

  // Focus message input on mount
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.focus()
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Adjust position to stay in viewport
  const getAdjustedPosition = () => {
    const dialogWidth = 360
    const dialogHeight = 400
    
    let left = position.x
    let top = position.y + 10

    if (left + dialogWidth > window.innerWidth - 20) {
      left = window.innerWidth - dialogWidth - 20
    }
    if (left < 20) {
      left = 20
    }
    if (top + dialogHeight > window.innerHeight - 20) {
      top = position.y - dialogHeight - 10
    }

    return { left, top }
  }

  // Build a human-readable display text for the reminder
  const buildDisplayText = (dateStr, timeStr, msg, earlyMin) => {
    const [year, month, day] = dateStr.split('-')
    const dateObj = new Date(year, month - 1, day)
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' })
    
    // Convert 24h time to 12h format
    const [hours, minutes] = timeStr.split(':')
    const hour12 = parseInt(hours) % 12 || 12
    const ampm = parseInt(hours) < 12 ? 'AM' : 'PM'
    const formattedTime = `${hour12}:${minutes} ${ampm}`
    
    // Build early reminder text
    let earlyText = ''
    if (earlyMin > 0) {
      if (earlyMin >= 1440) {
        earlyText = ' (1 day early reminder)'
      } else if (earlyMin >= 60) {
        earlyText = ` (${earlyMin / 60}h early reminder)`
      } else {
        earlyText = ` (${earlyMin}min early reminder)`
      }
    }
    
    return `🔔 ${dayName}, ${monthName} ${day} at ${formattedTime}: "${msg}"${earlyText}`
  }

  const handleSave = async () => {
    if (!message.trim()) {
      setError('Please enter a reminder message')
      return
    }
    if (!date) {
      setError('Please select a date')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build ISO date string for the API
      const [year, month, day] = date.split('-')
      const [hours, minutes] = time.split(':')
      const dueDate = new Date(year, month - 1, day, hours, minutes).toISOString()
      
      const earlyMin = parseInt(earlyReminder)
      
      // Create the reminder directly with structured data
      const result = await remindersApi.create({
        noteId,
        blockId,
        message: message.trim(),
        dueDate,
        earlyReminderMinutes: earlyMin,
      })
      
      // Build display text for the text block
      const displayText = buildDisplayText(date, time, message.trim(), earlyMin)
      
      setSaved(true)
      
      // Trigger a poll to schedule the new reminder immediately
      triggerPoll()
      
      // Pass back the reminder data to insert into the text block
      setTimeout(() => {
        onSave({
          reminderId: result.id,
          text: displayText,
          dueDate: result.due_date,
          message: message.trim(),
          earlyReminder: earlyMin,
        })
      }, 500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save reminder')
    } finally {
      setIsLoading(false)
    }
  }

  const adjustedPosition = getAdjustedPosition()

  const earlyReminderOptions = [
    { value: '0', label: 'At time of event' },
    { value: '5', label: '5 minutes before' },
    { value: '15', label: '15 minutes before' },
    { value: '30', label: '30 minutes before' },
    { value: '60', label: '1 hour before' },
    { value: '1440', label: '1 day before' },
  ]

  return (
    <div
      ref={dialogRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{
        left: adjustedPosition.left,
        top: adjustedPosition.top,
        width: '360px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-gray-800">Set Reminder</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/50 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Saved confirmation */}
      {saved && (
        <div className="p-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-800">Reminder saved!</p>
        </div>
      )}

      {/* Form */}
      {!saved && (
        <div className="p-4 space-y-4">
          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Reminder Message
            </label>
            <input
              ref={messageRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to be reminded about?"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-gray-400"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                <Clock className="w-3 h-3 inline mr-1" />
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Early Reminder */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Remind me
            </label>
            <select
              value={earlyReminder}
              onChange={(e) => setEarlyReminder(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              {earlyReminderOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Save Reminder
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
