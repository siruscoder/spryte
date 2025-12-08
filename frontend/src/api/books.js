import client from './client'

export const booksApi = {
  getAll: async () => {
    const response = await client.get('/books')
    return response.data
  },

  getTree: async () => {
    const response = await client.get('/books/tree')
    return response.data
  },

  getById: async (id) => {
    const response = await client.get(`/books/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/books', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/books/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await client.delete(`/books/${id}`)
    return response.data
  },

  getChildren: async (id) => {
    const response = await client.get(`/books/${id}/children`)
    return response.data
  },
}
