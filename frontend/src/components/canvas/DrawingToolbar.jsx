import { useState, useRef, useEffect } from 'react'
import { 
  Pencil, 
  Minus, 
  ArrowRight, 
  Circle, 
  Square,
  ChevronDown 
} from 'lucide-react'
import { useAddonsStore } from '../../stores'

const SHAPE_ICONS = {
  Minus,
  ArrowRight,
  Circle,
  Square,
  Pencil,
}

export default function DrawingToolbar({ onSelectShape, activeShape }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { uiComponents } = useAddonsStore()

  // Find the drawing component
  const drawingComponent = uiComponents.find(c => c.id === 'drawing')

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!drawingComponent) return null

  const handleSelectShape = (item) => {
    onSelectShape(item.shape_type)
    setIsOpen(false)
  }

  const handleClearShape = () => {
    onSelectShape(null)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          activeShape
            ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <Pencil className="w-4 h-4" />
        <span>Drawing</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50">
          {drawingComponent.items.map((item) => {
            const IconComponent = SHAPE_ICONS[item.icon] || Pencil
            const isActive = activeShape === item.shape_type
            return (
              <button
                key={item.id}
                onClick={() => handleSelectShape(item)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm">{item.name}</span>
              </button>
            )
          })}
          
          {activeShape && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={handleClearShape}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">Cancel Drawing</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
