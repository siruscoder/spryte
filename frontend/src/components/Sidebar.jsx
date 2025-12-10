import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
} from 'lucide-react'
import { useBooksStore, useNotesStore } from '../stores'

function TreeItem({ item, type, level = 0, onSelect, onCreateChild, onEdit, onDelete, selectedId }) {
  const isSelected = item.id === selectedId
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
    onSelect(item)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-primary-100 hover:bg-primary-150' 
            : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse icon */}
        <button
          className={`w-4 h-4 flex items-center justify-center ${
            hasChildren ? 'text-gray-400' : 'invisible'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Icon */}
        {type === 'book' ? (
          <BookOpen
            className="w-4 h-4 flex-shrink-0"
            style={{ color: item.color || '#6366f1' }}
          />
        ) : (
          <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
        )}

        {/* Title */}
        <span className="flex-1 text-sm text-gray-700 truncate">{item.name || item.title}</span>

        {/* Actions menu */}
        <div className="relative">
          <button
            className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {type === 'book' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                        onCreateChild(item, 'book')
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Add sub-book
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                        onCreateChild(item, 'note')
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Add note
                    </button>
                    <hr className="my-1" />
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit(item)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                >
                  <Pencil className="w-4 h-4" />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete(item)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {item.children.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              type={type}
              level={level + 1}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onDelete={onDelete}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteTreeItem({ item, level = 0, onSelect, onCreateChild, onEdit, onDelete, selectedId }) {
  const isSelected = item.id === selectedId
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  const handleClick = () => {
    onSelect(item)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-primary-100 hover:bg-primary-150' 
            : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse icon */}
        <button
          className={`w-4 h-4 flex items-center justify-center ${
            hasChildren ? 'text-gray-400' : 'invisible'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Icon */}
        <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />

        {/* Title */}
        <span className="flex-1 text-sm text-gray-700 truncate">{item.title}</span>

        {/* Linked indicator */}
        {item.linked_count > 0 && (
          <span className="text-xs text-gray-400 mr-1">{item.linked_count}</span>
        )}

        {/* Actions menu */}
        <div className="relative">
          <button
            className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onCreateChild(item)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                >
                  <Plus className="w-4 h-4" />
                  Add sub-note
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit(item)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                >
                  <Pencil className="w-4 h-4" />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete(item)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {item.children.map((child) => (
            <NoteTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onDelete={onDelete}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  
  const {
    booksTree,
    selectedBook,
    fetchBooks,
    selectBook,
    createBook,
    updateBook,
    deleteBook,
  } = useBooksStore()

  const {
    notesTree,
    selectedNote,
    fetchNotes,
    selectNote,
    createNote,
    updateNote,
    deleteNote,
  } = useNotesStore()

  const [showCreateBook, setShowCreateBook] = useState(false)
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [parentForNew, setParentForNew] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  useEffect(() => {
    if (selectedBook) {
      fetchNotes(selectedBook.id)
    } else {
      fetchNotes(null) // Clear notes when no book selected
    }
  }, [selectedBook, fetchNotes])

  const handleCreateBook = async (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      await createBook({
        name: newItemName,
        parent_id: parentForNew?.id || null,
      })
      setShowCreateBook(false)
      setNewItemName('')
      setParentForNew(null)
    } catch (err) {
      console.error('Failed to create book:', err)
    }
  }

  const handleCreateNote = async (e) => {
    e.preventDefault()
    if (!newItemName.trim() || !selectedBook) return

    try {
      await createNote({
        title: newItemName,
        book_id: selectedBook.id,
        parent_id: parentForNew?.id || null,
      })
      setShowCreateNote(false)
      setNewItemName('')
      setParentForNew(null)
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    if (!editName.trim() || !editingItem) return

    try {
      if (editingItem.type === 'book') {
        await updateBook(editingItem.item.id, { name: editName })
      } else {
        await updateNote(editingItem.item.id, { title: editName })
      }
      setEditingItem(null)
      setEditName('')
    } catch (err) {
      console.error('Failed to update:', err)
    }
  }

  const handleDelete = async (item, type) => {
    const confirmMsg =
      type === 'book'
        ? `Delete "${item.name}" and all its contents?`
        : `Delete "${item.title}"?`

    if (!window.confirm(confirmMsg)) return

    try {
      if (type === 'book') {
        await deleteBook(item.id)
      } else {
        await deleteNote(item.id)
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Books section */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Books
          </h3>
          <button
            data-create-book
            onClick={() => {
              setParentForNew(null)
              setShowCreateBook(true)
            }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Create book form */}
        {showCreateBook && (
          <form onSubmit={handleCreateBook} className="mb-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={parentForNew ? 'Sub-book name...' : 'Book name...'}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
              onBlur={() => {
                if (!newItemName.trim()) {
                  setShowCreateBook(false)
                  setParentForNew(null)
                }
              }}
            />
          </form>
        )}

        {/* Books tree */}
        <div className="space-y-0.5">
          {booksTree.map((book) => (
            <TreeItem
              key={book.id}
              item={book}
              type="book"
              selectedId={selectedBook?.id}
              onSelect={(b) => selectBook(b)}
              onCreateChild={(parent, childType) => {
                setParentForNew(parent)
                if (childType === 'book') {
                  setShowCreateBook(true)
                } else {
                  selectBook(parent)
                  setShowCreateNote(true)
                }
              }}
              onEdit={(b) => {
                setEditingItem({ item: b, type: 'book' })
                setEditName(b.name)
              }}
              onDelete={(b) => handleDelete(b, 'book')}
            />
          ))}
        </div>

        {booksTree.length === 0 && !showCreateBook && (
          <p className="text-xs text-gray-400 text-center py-4">
            No books yet. Create one to get started.
          </p>
        )}
      </div>

      {/* Notes section (shown when a book is selected) */}
      {selectedBook && (
        <div className="flex-1 p-3 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Notes
            </h3>
            <button
              onClick={() => {
                setParentForNew(null)
                setShowCreateNote(true)
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Create note form */}
          {showCreateNote && (
            <form onSubmit={handleCreateNote} className="mb-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={parentForNew ? 'Sub-note title...' : 'Note title...'}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
                onBlur={() => {
                  if (!newItemName.trim()) {
                    setShowCreateNote(false)
                    setParentForNew(null)
                  }
                }}
              />
            </form>
          )}

          {/* Notes tree */}
          <div className="space-y-0.5">
            {notesTree.map((note) => (
              <NoteTreeItem
                key={note.id}
                item={note}
                selectedId={selectedNote?.id}
                onSelect={(n) => {
                  selectNote(n.id)
                  navigate(`/app/note/${n.id}`)
                }}
                onCreateChild={(parent) => {
                  setParentForNew(parent)
                  setShowCreateNote(true)
                }}
                onEdit={(n) => {
                  setEditingItem({ item: n, type: 'note' })
                  setEditName(n.title)
                }}
                onDelete={(n) => handleDelete(n, 'note')}
              />
            ))}
          </div>

          {notesTree.length === 0 && !showCreateNote && (
            <p className="text-xs text-gray-400 text-center py-4">
              No notes in this book yet.
            </p>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">
              Rename {editingItem.type === 'book' ? 'Book' : 'Note'}
            </h3>
            <form onSubmit={handleEditSave}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null)
                    setEditName('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
