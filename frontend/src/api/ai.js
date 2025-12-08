import client from './client'

export const aiApi = {
  transform: async (text, action, context = null) => {
    const response = await client.post('/ai/transform', { text, action, context })
    return response.data
  },

  getActions: async () => {
    const response = await client.get('/ai/actions')
    return response.data
  },
}
