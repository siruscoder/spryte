import { create } from 'zustand'
import { booksApi } from '../api'

const useBooksStore = create((set, get) => ({
  booksTree: [],
  selectedBook: null,
  isLoading: false,
  error: null,

  fetchBooks: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await booksApi.getTree()
      set({ booksTree: data.books, isLoading: false })
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch books'
      set({ error: message, isLoading: false })
    }
  },

  selectBook: (book) => {
    set({ selectedBook: book })
  },

  createBook: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await booksApi.create(data)
      await get().fetchBooks()
      set({ isLoading: false })
      return response.book
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create book'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  updateBook: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await booksApi.update(id, data)
      await get().fetchBooks()
      // Update selected book if it was the one updated
      if (get().selectedBook?.id === id) {
        set({ selectedBook: response.book })
      }
      set({ isLoading: false })
      return response.book
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update book'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  deleteBook: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await booksApi.delete(id)
      // Clear selected book if it was deleted
      if (get().selectedBook?.id === id) {
        set({ selectedBook: null })
      }
      await get().fetchBooks()
      set({ isLoading: false })
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete book'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  clearError: () => set({ error: null }),
}))

export default useBooksStore
