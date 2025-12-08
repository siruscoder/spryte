import client from './client'

export const notesApi = {
  getAll: async (bookId = null) => {
    const params = bookId ? { book_id: bookId } : {}
    const response = await client.get('/notes', { params })
    return response.data
  },

  getTree: async (bookId) => {
    const response = await client.get(`/notes/tree/${bookId}`)
    return response.data
  },

  getById: async (id) => {
    const response = await client.get(`/notes/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await client.post('/notes', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await client.put(`/notes/${id}`, data)
    return response.data
  },

  updateCanvas: async (id, canvasData) => {
    const response = await client.put(`/notes/${id}/canvas`, { canvas_data: canvasData })
    return response.data
  },

  delete: async (id) => {
    const response = await client.delete(`/notes/${id}`)
    return response.data
  },

  addLink: async (noteId, linkedNoteId) => {
    const response = await client.post(`/notes/${noteId}/link`, { linked_note_id: linkedNoteId })
    return response.data
  },

  removeLink: async (noteId, linkedNoteId) => {
    const response = await client.delete(`/notes/${noteId}/link/${linkedNoteId}`)
    return response.data
  },

  search: async (query, bookId = null) => {
    const params = { q: query }
    if (bookId) params.book_id = bookId
    const response = await client.get('/notes/search', { params })
    return response.data
  },

  addAnnotation: async (noteId, annotation) => {
    const response = await client.post(`/notes/${noteId}/annotations`, annotation)
    return response.data
  },

  deleteAnnotation: async (noteId, annotationId) => {
    const response = await client.delete(`/notes/${noteId}/annotations/${annotationId}`)
    return response.data
  },
}
