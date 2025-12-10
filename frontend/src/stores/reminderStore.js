import { create } from 'zustand'

/**
 * Reminder store - manages active reminder notifications
 * Shared between ReminderNotifier and ReminderBell components
 */
const useReminderStore = create((set, get) => ({
  // Active notifications (reminders that have triggered)
  activeNotifications: [],
  
  // Whether the bell should be ringing (animation)
  isRinging: false,
  
  // Callback to trigger a poll (set by ReminderNotifier)
  pollCallback: null,
  
  // Set the poll callback
  setPollCallback: (callback) => {
    set({ pollCallback: callback })
  },
  
  // Trigger an immediate poll
  triggerPoll: () => {
    const { pollCallback } = get()
    if (pollCallback) {
      pollCallback()
    }
  },
  
  // Add a notification
  addNotification: (reminder) => {
    const { activeNotifications } = get()
    // Don't add duplicates
    if (activeNotifications.some(n => n.id === reminder.id)) return
    
    set({
      activeNotifications: [...activeNotifications, reminder],
      isRinging: true,
    })
    
    // Stop ringing animation after 3 seconds
    setTimeout(() => {
      set({ isRinging: false })
    }, 3000)
  },
  
  // Remove a notification
  removeNotification: (reminderId) => {
    set(state => ({
      activeNotifications: state.activeNotifications.filter(n => n.id !== reminderId),
    }))
  },
  
  // Clear all notifications
  clearAll: () => {
    set({ activeNotifications: [], isRinging: false })
  },
}))

export default useReminderStore
