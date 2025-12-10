import { useRef, useEffect } from 'react'
import { X, Trash2, Sparkles } from 'lucide-react'

export default function AnnotationPopup({ 
  annotation, 
  position, 
  onClose, 
  onDelete 
}) {
  const popupRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
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
  const getAdjustedPosition = () => {
    const popupWidth = 350
    const popupHeight = 300
    
    let left = position.x
    let top = position.y + 10

    if (left + popupWidth > window.innerWidth - 20) {
      left = window.innerWidth - popupWidth - 20
    }
    if (left < 20) {
      left = 20
    }
    if (top + popupHeight > window.innerHeight - 20) {
      top = position.y - popupHeight - 10
    }

    return { left, top }
  }

  const adjustedPosition = getAdjustedPosition()

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{
        left: adjustedPosition.left,
        top: adjustedPosition.top,
        width: '350px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-primary-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-800">AI Insight</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/50 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Selected text */}
      <div className="px-4 py-2 bg-purple-50 border-b border-gray-100">
        <p className="text-xs text-purple-600 mb-1">Annotated text:</p>
        <p className="text-sm text-gray-800 font-medium line-clamp-2">
          "{annotation.selected_text}"
        </p>
      </div>

      {/* Insight content */}
      <div className="p-4">
        <div className="p-3 bg-gray-50 rounded-lg max-h-60 overflow-y-scroll border border-gray-100">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {annotation.insight}
          </p>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={() => onDelete(annotation.id)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove annotation
          </button>
        )}
      </div>
    </div>
  )
}
