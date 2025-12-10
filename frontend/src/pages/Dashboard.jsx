import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen, FileText, Plus, Sparkles } from 'lucide-react'
import { useBooksStore, useNotesStore, useAddonsStore } from '../stores'
import { SpriteCanvas, FloatingDrawingToolbar } from '../components'

export default function Dashboard() {
  const { booksTree, fetchBooks, selectedBook } = useBooksStore()
  const { selectedNote, linkedNotes, selectNote } = useNotesStore()
  const { fetchCommands } = useAddonsStore()
  const navigate = useNavigate()
  const { noteId } = useParams()
  const [activeDrawingShape, setActiveDrawingShape] = useState(null)
  const [strokeColor, setStrokeColor] = useState('#374151')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [strokeStyle, setStrokeStyle] = useState('solid')
  const [fillColor, setFillColor] = useState('transparent')
  const [selectedShape, setSelectedShape] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    fetchBooks()
    fetchCommands()
  }, [fetchBooks, fetchCommands])

  // Load note from URL params if present
  useEffect(() => {
    if (noteId && (!selectedNote || selectedNote.id !== noteId)) {
      selectNote(noteId)
    }
  }, [noteId, selectedNote, selectNote])

  // If a note is selected, show the canvas
  if (selectedNote) {
    return (
      <div className="h-full flex flex-col">
        {/* Note header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h2 className="font-medium text-gray-900">{selectedNote.title}</h2>
          </div>
          {linkedNotes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{linkedNotes.length} linked note{linkedNotes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        
        {/* Canvas with floating toolbar */}
        <div className="flex-1 relative">
          <FloatingDrawingToolbar
            activeShape={activeDrawingShape}
            onSelectShape={setActiveDrawingShape}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            strokeStyle={strokeStyle}
            fillColor={fillColor}
            onStrokeColorChange={(color) => {
              setStrokeColor(color)
              if (selectedShape && canvasRef.current) {
                canvasRef.current.updateSelectedShape({ strokeColor: color })
              }
            }}
            onStrokeWidthChange={(width) => {
              setStrokeWidth(width)
              if (selectedShape && canvasRef.current) {
                canvasRef.current.updateSelectedShape({ strokeWidth: width })
              }
            }}
            onStrokeStyleChange={(style) => {
              setStrokeStyle(style)
              if (selectedShape && canvasRef.current) {
                canvasRef.current.updateSelectedShape({ strokeStyle: style })
              }
            }}
            onFillColorChange={(color) => {
              setFillColor(color)
              if (selectedShape && canvasRef.current) {
                canvasRef.current.updateSelectedShape({ fillColor: color })
              }
            }}
            selectedShape={selectedShape}
          />
          <SpriteCanvas 
            ref={canvasRef}
            note={selectedNote} 
            activeDrawingShape={activeDrawingShape}
            onDrawingShapeChange={setActiveDrawingShape}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            strokeStyle={strokeStyle}
            fillColor={fillColor}
            onSelectedShapeChange={setSelectedShape}
          />
        </div>
      </div>
    )
  }

  // If a book is selected but no note, show book contents
  if (selectedBook) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: selectedBook.color + '20' }}
            >
              <BookOpen
                className="w-5 h-5"
                style={{ color: selectedBook.color }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedBook.name}
              </h1>
              {selectedBook.description && (
                <p className="text-gray-500">{selectedBook.description}</p>
              )}
            </div>
          </div>

          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a note from the sidebar or create a new one</p>
          </div>
        </div>
      </div>
    )
  }

  // Default: Welcome screen
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Spryte
        </h1>
        <p className="text-gray-600 mb-8">
          {booksTree.length === 0
            ? 'Get started by creating your first book to organize your notes.'
            : 'Select a book from the sidebar to view your notes, or create a new one.'}
        </p>
        {booksTree.length === 0 && (
          <button
            onClick={() => {
              // This will be handled by the sidebar's create book functionality
              document.querySelector('[data-create-book]')?.click()
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create your first book
          </button>
        )}
      </div>
    </div>
  )
}
