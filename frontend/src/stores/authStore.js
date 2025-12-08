import { create } from 'zustand'
import { authApi } from '../api'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.login(email, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({
        user: data.user,
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.register(email, password, name)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({
        user: data.user,
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    })
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.updateProfile(data)
      localStorage.setItem('user', JSON.stringify(response.user))
      set({ user: response.user, isLoading: false })
      return response
    } catch (error) {
      const message = error.response?.data?.error || 'Update failed'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.changePassword(currentPassword, newPassword)
      set({ isLoading: false })
      return response
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  updateSettings: async (settings) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.updateSettings(settings)
      localStorage.setItem('user', JSON.stringify(response.user))
      set({ user: response.user, isLoading: false })
      return response
    } catch (error) {
      const message = error.response?.data?.error || 'Settings update failed'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  clearError: () => set({ error: null }),

  refreshUser: async () => {
    try {
      const data = await authApi.getMe()
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user })
    } catch (error) {
      // Token might be invalid
      get().logout()
    }
  },
}))

export default useAuthStore
