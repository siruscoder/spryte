import { create } from 'zustand'
import { notesApi } from '../api'

const useNotesStore = create((set, get) => ({
  notesTree: [],
  currentBookId: null,
  selectedNote: null,
  linkedNotes: [],
  isLoading: false,
  isSaving: false,
  error: null,

  // Fetch notes for a book and store the bookId
  fetchNotes: async (bookId) => {
    if (!bookId) {
      set({ notesTree: [], currentBookId: null })
      return
    }
    set({ isLoading: true, error: null, currentBookId: bookId })
    try {
      const data = await notesApi.getTree(bookId)
      set({ notesTree: data.notes || [], isLoading: false })
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch notes'
      set({ error: message, isLoading: false, notesTree: [] })
    }
  },

  // Refresh current book's notes
  refreshNotes: async () => {
    const bookId = get().currentBookId
    if (bookId) {
      await get().fetchNotes(bookId)
    }
  },

  selectNote: async (noteId) => {
    if (!noteId) {
      set({ selectedNote: null, linkedNotes: [] })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const data = await notesApi.getById(noteId)
      set({
        selectedNote: data.note,
        linkedNotes: data.linked_notes || [],
        isLoading: false,
      })
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch note'
      set({ error: message, isLoading: false })
    }
  },

  createNote: async (noteData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await notesApi.create(noteData)
      await get().refreshNotes()
      set({ isLoading: false })
      return response.note
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create note'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  updateNote: async (id, noteData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await notesApi.update(id, noteData)
      await get().refreshNotes()
      // Update selected note if it was the one updated
      if (get().selectedNote?.id === id) {
        set({ selectedNote: response.note })
      }
      set({ isLoading: false })
      return response.note
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update note'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  saveCanvas: async (id, canvasData) => {
    set({ isSaving: true })
    try {
      await notesApi.updateCanvas(id, canvasData)
      const currentNote = get().selectedNote
      if (currentNote?.id === id) {
        set({ selectedNote: { ...currentNote, canvas_data: canvasData } })
      }
      set({ isSaving: false })
    } catch (error) {
      console.error('Failed to save canvas:', error)
      set({ isSaving: false })
    }
  },

  deleteNote: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await notesApi.delete(id)
      // Clear selected note if it was deleted
      if (get().selectedNote?.id === id) {
        set({ selectedNote: null, linkedNotes: [] })
      }
      await get().refreshNotes()
      set({ isLoading: false })
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete note'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  addLink: async (noteId, linkedNoteId) => {
    try {
      await notesApi.addLink(noteId, linkedNoteId)
      if (get().selectedNote?.id === noteId) {
        await get().selectNote(noteId)
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add link'
      throw new Error(message)
    }
  },

  removeLink: async (noteId, linkedNoteId) => {
    try {
      await notesApi.removeLink(noteId, linkedNoteId)
      if (get().selectedNote?.id === noteId) {
        await get().selectNote(noteId)
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to remove link'
      throw new Error(message)
    }
  },

  searchNotes: async (query, bookId = null) => {
    try {
      const data = await notesApi.search(query, bookId)
      return data.notes
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  },

  addAnnotation: async (noteId, annotation) => {
    try {
      const data = await notesApi.addAnnotation(noteId, annotation)
      // Update selected note with new annotations
      const selectedNote = get().selectedNote
      if (selectedNote?.id === noteId) {
        set({ selectedNote: { ...selectedNote, annotations: data.annotations } })
      }
      return data.annotation
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add annotation'
      throw new Error(message)
    }
  },

  deleteAnnotation: async (noteId, annotationId) => {
    try {
      const data = await notesApi.deleteAnnotation(noteId, annotationId)
      // Update selected note with updated annotations
      const selectedNote = get().selectedNote
      if (selectedNote?.id === noteId) {
        set({ selectedNote: { ...selectedNote, annotations: data.annotations } })
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete annotation'
      throw new Error(message)
    }
  },

  clearError: () => set({ error: null }),
  clearSelection: () => set({ selectedNote: null, linkedNotes: [] }),
}))

export default useNotesStore
