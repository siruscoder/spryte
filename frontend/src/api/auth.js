import client from './client'

export const authApi = {
  register: async (email, password, name) => {
    const response = await client.post('/auth/register', { email, password, name })
    return response.data
  },

  login: async (email, password) => {
    const response = await client.post('/auth/login', { email, password })
    return response.data
  },

  getMe: async () => {
    const response = await client.get('/auth/me')
    return response.data
  },

  updateProfile: async (data) => {
    const response = await client.put('/auth/profile', data)
    return response.data
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await client.put('/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },

  updateSettings: async (settings) => {
    const response = await client.put('/auth/settings', { settings })
    return response.data
  },
}
