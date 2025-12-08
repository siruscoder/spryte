import { useState, useEffect, useRef } from 'react'
import {
  Wand2,
  FileText,
  Expand,
  List,
  Lightbulb,
  CheckSquare,
  Loader2,
  X,
} from 'lucide-react'
import { aiApi } from '../api'

const AI_ACTIONS = [
  { id: 'rewrite', name: 'Rewrite for Clarity', icon: Wand2 },
  { id: 'summarize', name: 'Summarize', icon: FileText },
  { id: 'expand', name: 'Expand', icon: Expand },
  { id: 'bullets', name: 'Convert to Bullets', icon: List },
  { id: 'insights', name: 'Generate Insights', icon: Lightbulb },
  { id: 'tasks', name: 'Extract Tasks', icon: CheckSquare },
]

export default function AIContextMenu({ x, y, text, onTransform, onClose }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const menuRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Adjust position to stay in viewport
  const adjustedPosition = {
    left: Math.min(x, window.innerWidth - 250),
    top: Math.min(y, window.innerHeight - 400),
  }

  const handleAction = async (actionId) => {
    if (!text.trim()) {
      setError('No text to transform')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await aiApi.transform(text, actionId)
      setResult(response.text)
    } catch (err) {
      setError(err.response?.data?.error || 'AI transformation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (result) {
      onTransform(result)
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
      style={adjustedPosition}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-medium text-gray-700">AI Actions</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Transforming text...</p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
            {error}
          </div>
          <button
            onClick={() => setError(null)}
            className="btn-secondary w-full text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result preview */}
      {result && !isLoading && (
        <div className="p-4 max-w-sm">
          <p className="text-xs text-gray-500 mb-2">Preview:</p>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-40 overflow-auto mb-3 whitespace-pre-wrap">
            {result}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setResult(null)}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="btn-primary flex-1 text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Actions list */}
      {!isLoading && !error && !result && (
        <div className="py-1">
          {AI_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <action.icon className="w-4 h-4 text-gray-400" />
              {action.name}
            </button>
          ))}
        </div>
      )}

      {/* Original text preview */}
      {!isLoading && !result && text && (
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">
            Selected: "{text.slice(0, 50)}{text.length > 50 ? '...' : ''}"
          </p>
        </div>
      )}
    </div>
  )
}
