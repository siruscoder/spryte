import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

const RESIZE_HANDLE_SIZE = 8

function useIconDrag(onUpdate, zoom) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef(null)

  const startDrag = (currentPosition) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentPosition.x,
      posY: currentPosition.y,
    }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!dragStartRef.current) return
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / zoom
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / zoom
      onUpdate({
        position: {
          x: dragStartRef.current.posX + deltaX,
          y: dragStartRef.current.posY + deltaY,
        },
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, zoom, onUpdate])

  return { isDragging, startDrag }
}

function useIconResize(onUpdate, zoom) {
  const [resizing, setResizing] = useState(false)
  const resizeStartRef = useRef(null)

  const startResize = (currentSize, currentPosition) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      size: currentSize,
      posX: currentPosition.x,
      posY: currentPosition.y,
    }
    setResizing(true)
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e) => {
      if (!resizeStartRef.current) return
      const deltaX = (e.clientX - resizeStartRef.current.mouseX) / zoom
      const deltaY = (e.clientY - resizeStartRef.current.mouseY) / zoom
      
      const avgDelta = (deltaX + deltaY) / 2
      const newSize = Math.max(20, resizeStartRef.current.size + avgDelta)

      onUpdate({
        size: newSize,
      })
    }

    const handleMouseUp = () => {
      setResizing(false)
      resizeStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing, zoom, onUpdate])

  return { resizing, startResize }
}

export default function IconBlock({ block, isSelected, isMinimalist, onSelect, onUpdate, onDelete, zoom }) {
  const [isHovered, setIsHovered] = useState(false)
  const iconRef = useRef(null)
  
  const { iconName, color = '#374151', fillColor = 'none', size = 48 } = block
  const position = block.position || { x: 0, y: 0 }
  const rotation = block.rotation || 0

  const { isDragging, startDrag } = useIconDrag(onUpdate, zoom)
  const { resizing, startResize } = useIconResize(onUpdate, zoom)

  const IconComponent = LucideIcons[iconName] || LucideIcons.HelpCircle

  const handleMouseDown = (e) => {
    e.stopPropagation()
    onSelect()
    startDrag(position)(e)
  }

  return (
    <div
      ref={iconRef}
      className={`absolute ${isSelected ? 'z-10' : 'z-0'}`}
      style={{
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        cursor: isDragging ? 'grabbing' : 'move',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection ring */}
      <div
        className={`absolute inset-0 rounded ${
          isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : isHovered ? 'ring-1 ring-gray-300' : ''
        }`}
      />
      
      {/* Icon */}
      <IconComponent 
        className="w-full h-full" 
        style={{ color, fill: fillColor === 'transparent' ? 'none' : fillColor }}
        strokeWidth={1.5}
      />

      {/* Resize handle (bottom-right corner when selected) */}
      {isSelected && (
        <div
          className="absolute bg-white border-2 border-primary-500 hover:bg-primary-100 rounded-full"
          style={{
            width: RESIZE_HANDLE_SIZE,
            height: RESIZE_HANDLE_SIZE,
            right: -RESIZE_HANDLE_SIZE / 2,
            bottom: -RESIZE_HANDLE_SIZE / 2,
            cursor: 'nwse-resize',
            pointerEvents: 'auto',
          }}
          onMouseDown={startResize(size, position)}
        />
      )}

      {/* Delete button */}
      {(isSelected || isHovered) && !isMinimalist && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-20"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
