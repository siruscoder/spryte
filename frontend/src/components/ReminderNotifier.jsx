import { useEffect, useRef, useCallback } from 'react'
import { remindersApi } from '../api'
import { useAuthStore, useReminderStore } from '../stores'

const POLL_INTERVAL = 3 * 60 * 1000 // 3 minutes

/**
 * ReminderNotifier - Polls for upcoming reminders and triggers notifications
 * 
 * Flow:
 * 1. Poll /api/reminders/due every 3 minutes
 * 2. Backend returns reminders triggering in next 5 minutes (with trigger_time)
 * 3. Schedule local setTimeout for each reminder at its trigger_time
 * 4. Add to reminder store when timer fires (triggers bell + toast)
 * 5. Mark reminder as notified via API
 * 
 * This component doesn't render anything - it just manages the polling and scheduling.
 * The ReminderBell component displays the notifications.
 */
export default function ReminderNotifier() {
  const { isAuthenticated } = useAuthStore()
  const { addNotification, setPollCallback } = useReminderStore()
  const scheduledTimersRef = useRef(new Map()) // reminderId -> timeoutId
  const pollIntervalRef = useRef(null)

  // Show a notification for a reminder
  const showNotification = useCallback(async (reminder) => {
    // Add to store (triggers bell ring + shows in dropdown)
    addNotification(reminder)

    // Mark as notified in backend
    try {
      await remindersApi.markNotified(reminder.id)
    } catch (err) {
      console.error('Failed to mark reminder as notified:', err)
    }

    // Also try browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification('🔔 Reminder', {
        body: reminder.message,
        icon: '/favicon.ico',
        tag: reminder.id,
      })
    }
  }, [addNotification])

  // Schedule a timer for a reminder
  const scheduleReminder = useCallback((reminder) => {
    const reminderId = reminder.id
    
    // Don't schedule if already scheduled
    if (scheduledTimersRef.current.has(reminderId)) {
      console.log('[ReminderNotifier] Already scheduled:', reminderId)
      return
    }

    const triggerTime = new Date(reminder.trigger_time).getTime()
    const now = Date.now()
    const delay = triggerTime - now

    console.log('[ReminderNotifier] Scheduling reminder:', {
      id: reminderId,
      message: reminder.message,
      triggerTimeRaw: reminder.trigger_time,
      triggerTimeLocal: new Date(triggerTime).toLocaleString(),
      nowLocal: new Date(now).toLocaleString(),
      delayMs: delay,
      delaySeconds: Math.round(delay / 1000),
    })

    // If trigger time is in the past or very soon, trigger immediately
    if (delay <= 0) {
      console.log('[ReminderNotifier] Triggering immediately (past due):', reminder.message)
      showNotification(reminder)
      return
    }

    // Schedule the notification
    const timeoutId = setTimeout(() => {
      console.log('[ReminderNotifier] Triggering reminder:', reminder.message)
      showNotification(reminder)
      scheduledTimersRef.current.delete(reminderId)
    }, delay)

    scheduledTimersRef.current.set(reminderId, timeoutId)
  }, [showNotification])

  // Fetch upcoming reminders and schedule them
  const fetchAndSchedule = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const upcoming = await remindersApi.getDue()
      console.log('[ReminderNotifier] Fetched due reminders:', upcoming)
      
      // Schedule each reminder
      upcoming.forEach(reminder => {
        scheduleReminder(reminder)
      })
    } catch (err) {
      // Silently fail - user might not be logged in or network issue
      console.error('Failed to fetch due reminders:', err)
    }
  }, [isAuthenticated, scheduleReminder])

  // Register poll callback with store
  useEffect(() => {
    setPollCallback(fetchAndSchedule)
    return () => setPollCallback(null)
  }, [fetchAndSchedule, setPollCallback])

  // Start polling when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any existing timers and interval
      scheduledTimersRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      scheduledTimersRef.current.clear()
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Initial fetch
    fetchAndSchedule()

    // Set up polling interval
    pollIntervalRef.current = setInterval(fetchAndSchedule, POLL_INTERVAL)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      scheduledTimersRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      scheduledTimersRef.current.clear()
    }
  }, [isAuthenticated, fetchAndSchedule])

  // This component doesn't render anything - ReminderBell handles the UI
  return null
}
