import { useState, useRef, useEffect } from 'react'
import { 
  Minus, 
  ArrowRight, 
  Circle, 
  Square,
  Triangle,
  Pencil,
  X,
  Palette,
  Pipette
} from 'lucide-react'
import { useAddonsStore } from '../../stores'

const SHAPE_ICONS = {
  Minus,
  ArrowRight,
  Circle,
  Square,
  Triangle,
  Pencil,
}

// Preset colors for quick selection
const STROKE_COLORS = [
  '#374151', // gray-700 (default)
  '#000000', // black
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#EAB308', // yellow-500
  '#22C55E', // green-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
]

const FILL_COLORS = [
  'transparent',
  '#FEE2E2', // red-100
  '#FFEDD5', // orange-100
  '#FEF9C3', // yellow-100
  '#DCFCE7', // green-100
  '#DBEAFE', // blue-100
  '#EDE9FE', // violet-100
  '#F3F4F6', // gray-100
]

const STROKE_WIDTHS = [1, 2, 3, 4, 6]

export default function FloatingDrawingToolbar({ 
  activeShape, 
  onSelectShape,
  strokeColor,
  strokeWidth,
  fillColor,
  onStrokeColorChange,
  onStrokeWidthChange,
  onFillColorChange,
}) {
  const [showStrokeColors, setShowStrokeColors] = useState(false)
  const [showFillColors, setShowFillColors] = useState(false)
  const [showWidths, setShowWidths] = useState(false)
  const { uiComponents } = useAddonsStore()
  
  const strokeRef = useRef(null)
  const fillRef = useRef(null)
  const widthRef = useRef(null)

  // Find the drawing component from addons
  const drawingComponent = uiComponents.find(c => c.id === 'drawing')

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (strokeRef.current && !strokeRef.current.contains(e.target)) {
        setShowStrokeColors(false)
      }
      if (fillRef.current && !fillRef.current.contains(e.target)) {
        setShowFillColors(false)
      }
      if (widthRef.current && !widthRef.current.contains(e.target)) {
        setShowWidths(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectShape = (shapeType) => {
    if (activeShape === shapeType) {
      onSelectShape(null) // Toggle off if already selected
    } else {
      onSelectShape(shapeType)
    }
  }

  if (!drawingComponent) return null

  return (
    <div className="absolute top-3 right-3 z-30 flex gap-2">
      {/* Shape selector */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 flex gap-1">
        {drawingComponent.items.map((item) => {
          const IconComponent = SHAPE_ICONS[item.icon] || Pencil
          const isActive = activeShape === item.shape_type
          return (
            <button
              key={item.id}
              onClick={() => handleSelectShape(item.shape_type)}
              className={`p-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={item.name}
            >
              <IconComponent className="w-4 h-4" />
            </button>
          )
        })}
        
        {/* Cancel button when shape is active */}
        {activeShape && (
          <>
            <div className="w-px bg-gray-200 mx-0.5" />
            <button
              onClick={() => onSelectShape(null)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-400"
              title="Cancel Drawing"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Style controls - always visible */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 flex gap-1 items-center">
          {/* Stroke color */}
          <div className="relative" ref={strokeRef}>
            <button
              onClick={() => {
                setShowStrokeColors(!showStrokeColors)
                setShowFillColors(false)
                setShowWidths(false)
              }}
              className="p-2 rounded-md hover:bg-gray-100 flex items-center gap-1"
              title="Stroke Color"
            >
              <div 
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: strokeColor }}
              />
            </button>
            
            {showStrokeColors && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 min-w-[180px]">
                <div className="text-xs text-gray-500 mb-2 px-1">Stroke</div>
                <div className="grid grid-cols-4 gap-2">
                  {STROKE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        onStrokeColorChange(color)
                        setShowStrokeColors(false)
                      }}
                      className={`w-6 h-6 rounded border ${
                        strokeColor === color ? 'ring-2 ring-primary-500 ring-offset-1' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stroke width */}
          <div className="relative" ref={widthRef}>
            <button
              onClick={() => {
                setShowWidths(!showWidths)
                setShowStrokeColors(false)
                setShowFillColors(false)
              }}
              className="p-2 rounded-md hover:bg-gray-100 flex items-center justify-center min-w-[32px]"
              title="Stroke Width"
            >
              <div 
                className="bg-gray-700 rounded-full"
                style={{ width: Math.max(strokeWidth * 3, 8), height: strokeWidth + 1 }}
              />
            </button>
            
            {showWidths && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                <div className="text-xs text-gray-500 mb-1.5 px-1">Width</div>
                <div className="flex flex-col gap-1">
                  {STROKE_WIDTHS.map((width) => (
                    <button
                      key={width}
                      onClick={() => {
                        onStrokeWidthChange(width)
                        setShowWidths(false)
                      }}
                      className={`px-3 py-1.5 rounded flex items-center gap-2 ${
                        strokeWidth === width ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div 
                        className="bg-gray-700 rounded-full flex-shrink-0"
                        style={{ width: 24, height: width }}
                      />
                      <span className="text-xs text-gray-500">{width}px</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fill color */}
          <div className="relative" ref={fillRef}>
              <button
                onClick={() => {
                  setShowFillColors(!showFillColors)
                  setShowStrokeColors(false)
                  setShowWidths(false)
                }}
                className="p-2 rounded-md hover:bg-gray-100 flex items-center gap-1"
                title="Fill Color"
              >
                <Pipette className="w-3 h-3 text-gray-400" />
                <div 
                  className={`w-4 h-4 rounded border border-gray-300 ${
                    fillColor === 'transparent' ? 'bg-white' : ''
                  }`}
                  style={{ 
                    backgroundColor: fillColor === 'transparent' ? undefined : fillColor,
                    backgroundImage: fillColor === 'transparent' 
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : undefined,
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                  }}
                />
              </button>
              
          {showFillColors && (
            <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 min-w-[180px]">
              <div className="text-xs text-gray-500 mb-2 px-1">Fill</div>
              <div className="grid grid-cols-4 gap-2">
                {FILL_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onFillColorChange(color)
                      setShowFillColors(false)
                    }}
                    className={`w-6 h-6 rounded border ${
                      fillColor === color ? 'ring-2 ring-primary-500 ring-offset-1' : 'border-gray-200'
                    }`}
                    style={{ 
                      backgroundColor: color === 'transparent' ? undefined : color,
                      backgroundImage: color === 'transparent' 
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                      backgroundSize: '6px 6px',
                      backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
