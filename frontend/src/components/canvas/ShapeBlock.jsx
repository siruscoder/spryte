import { useState, useRef, useEffect } from 'react'
import { Trash2, RotateCw } from 'lucide-react'

// Constants
const ARROW_SIZE = 10
const HIT_AREA_PADDING = 15
const HANDLE_SIZE = 16
const RESIZE_HANDLE_SIZE = 8
const DEFAULT_STROKE_COLOR = '#374151'
const DEFAULT_STROKE_WIDTH = 2

// Convert stroke style to SVG stroke-dasharray
function getStrokeDashArray(strokeStyle, strokeWidth = 2) {
  switch (strokeStyle) {
    case 'dashed':
      return `${strokeWidth * 4},${strokeWidth * 2}`
    case 'dotted':
      return `${strokeWidth},${strokeWidth * 2}`
    default:
      return 'none'
  }
}

/**
 * Hook for dragging line endpoints with smooth updates
 */
function useEndpointDrag(onUpdate, zoom) {
  const [isDragging, setIsDragging] = useState(null)
  const dragStartRef = useRef(null)

  const startDrag = (endpoint, currentPoint) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      pointX: currentPoint.x,
      pointY: currentPoint.y,
    }
    setIsDragging(endpoint)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!dragStartRef.current) return
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / zoom
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / zoom
      const newPoint = {
        x: dragStartRef.current.pointX + deltaX,
        y: dragStartRef.current.pointY + deltaY,
      }
      onUpdate({ [isDragging === 'start' ? 'startPoint' : 'endPoint']: newPoint })
    }

    const handleMouseUp = () => {
      setIsDragging(null)
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

/**
 * Calculate line coordinates from block data
 */
function getLineCoordinates(block) {
  const startPoint = block.startPoint || { x: 0, y: 0 }
  const endPoint = block.endPoint || { x: 150, y: 0 }
  const pos = block.position || { x: 0, y: 0 }
  
  return {
    startPoint,
    endPoint,
    x1: pos.x + startPoint.x,
    y1: pos.y + startPoint.y,
    x2: pos.x + endPoint.x,
    y2: pos.y + endPoint.y,
  }
}

/**
 * Delete button component - shared between shape types
 */
function DeleteButton({ onClick, style, className = '' }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-20 ${className}`}
      style={style}
    >
      <Trash2 className="w-3 h-3" />
    </button>
  )
}

/**
 * Endpoint handle for lines/arrows
 */
function EndpointHandle({ x, y, isDragging, onMouseDown }) {
  return (
    <div
      className={`absolute w-4 h-4 bg-white border-2 border-primary-500 rounded-full cursor-crosshair hover:bg-primary-100 z-20 ${isDragging ? 'bg-primary-200' : ''}`}
      style={{
        left: x - HANDLE_SIZE / 2,
        top: y - HANDLE_SIZE / 2,
        pointerEvents: 'auto',
      }}
      onMouseDown={onMouseDown}
    />
  )
}

/**
 * Hook for dragging the entire line (moving position)
 */
function useLineDrag(onUpdate, zoom) {
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

/**
 * Line/Arrow shape component
 */
function LineShape({ block, isSelected, isMinimalist, onSelect, onUpdate, onDelete, zoom }) {
  const [isHovered, setIsHovered] = useState(false)
  const { strokeColor = DEFAULT_STROKE_COLOR, strokeWidth = DEFAULT_STROKE_WIDTH, strokeStyle = 'solid', shapeType } = block
  const isArrow = shapeType === 'arrow'
  const dashArray = getStrokeDashArray(strokeStyle, strokeWidth)
  
  const { startPoint, endPoint, x1, y1, x2, y2 } = getLineCoordinates(block)
  const { isDragging: isEndpointDragging, startDrag: startEndpointDrag } = useEndpointDrag(onUpdate, zoom)
  const { isDragging: isLineDragging, startDrag: startLineDrag } = useLineDrag(onUpdate, zoom)

  // Calculate arrow endpoint adjustment
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)
  const lineEndX = length > 0 && isArrow ? x2 - (dx / length) * ARROW_SIZE * 0.7 : x2
  const lineEndY = length > 0 && isArrow ? y2 - (dy / length) * ARROW_SIZE * 0.7 : y2

  // Hit area bounds
  const hitArea = {
    left: Math.min(x1, x2) - HIT_AREA_PADDING,
    top: Math.min(y1, y2) - HIT_AREA_PADDING,
    width: Math.abs(x2 - x1) + HIT_AREA_PADDING * 2,
    height: Math.max(Math.abs(y2 - y1) + HIT_AREA_PADDING * 2, 30),
  }

  const handleMouseDown = (e) => {
    e.stopPropagation()
    onSelect()
    // Start dragging the line
    startLineDrag(block.position || { x: 0, y: 0 })(e)
  }

  return (
    <>
      {/* Hit area for selection and dragging */}
      <div
        className={`absolute ${isSelected ? 'z-10' : 'z-0'}`}
        style={{
          ...hitArea,
          pointerEvents: 'auto',
          cursor: 'move',
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* SVG line */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: 1, height: 1, overflow: 'visible' }}
      >
        {isArrow && (
          <defs>
            <marker
              id={`arrowhead-${block.id}`}
              markerWidth={ARROW_SIZE}
              markerHeight={ARROW_SIZE}
              refX={ARROW_SIZE - 1}
              refY={ARROW_SIZE / 2}
              orient="auto"
            >
              <polygon
                points={`0 0, ${ARROW_SIZE} ${ARROW_SIZE / 2}, 0 ${ARROW_SIZE}`}
                fill={strokeColor}
              />
            </marker>
          </defs>
        )}
        <line
          x1={x1}
          y1={y1}
          x2={lineEndX}
          y2={lineEndY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          markerEnd={isArrow ? `url(#arrowhead-${block.id})` : undefined}
        />
      </svg>

      {/* Endpoint handles (when selected) */}
      {isSelected && (
        <>
          <EndpointHandle
            x={x1}
            y={y1}
            isDragging={isEndpointDragging === 'start'}
            onMouseDown={startEndpointDrag('start', startPoint)}
          />
          <EndpointHandle
            x={x2}
            y={y2}
            isDragging={isEndpointDragging === 'end'}
            onMouseDown={startEndpointDrag('end', endPoint)}
          />
        </>
      )}

      {/* Delete button */}
      {(isSelected || isHovered) && !isMinimalist && (
        <DeleteButton
          onClick={onDelete}
          className="absolute"
          style={{ left: x2 + 5, top: y2 - 20, pointerEvents: 'auto' }}
        />
      )}
    </>
  )
}

/**
 * Hook for dragging box shapes
 */
function useBoxDrag(onUpdate, zoom) {
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

/**
 * Hook for resizing box shapes
 */
function useBoxResize(onUpdate, zoom) {
  const [resizing, setResizing] = useState(null) // 'nw', 'ne', 'sw', 'se'
  const resizeStartRef = useRef(null)

  const startResize = (corner, currentSize, currentPosition) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: currentSize.width,
      height: currentSize.height,
      posX: currentPosition.x,
      posY: currentPosition.y,
    }
    setResizing(corner)
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e) => {
      if (!resizeStartRef.current) return
      const deltaX = (e.clientX - resizeStartRef.current.mouseX) / zoom
      const deltaY = (e.clientY - resizeStartRef.current.mouseY) / zoom
      
      let newWidth = resizeStartRef.current.width
      let newHeight = resizeStartRef.current.height
      let newX = resizeStartRef.current.posX
      let newY = resizeStartRef.current.posY

      // Handle different corners
      if (resizing.includes('e')) {
        newWidth = Math.max(30, resizeStartRef.current.width + deltaX)
      }
      if (resizing.includes('w')) {
        const widthDelta = Math.min(deltaX, resizeStartRef.current.width - 30)
        newWidth = resizeStartRef.current.width - widthDelta
        newX = resizeStartRef.current.posX + widthDelta
      }
      if (resizing.includes('s')) {
        newHeight = Math.max(30, resizeStartRef.current.height + deltaY)
      }
      if (resizing.includes('n')) {
        const heightDelta = Math.min(deltaY, resizeStartRef.current.height - 30)
        newHeight = resizeStartRef.current.height - heightDelta
        newY = resizeStartRef.current.posY + heightDelta
      }

      onUpdate({
        position: { x: newX, y: newY },
        size: { width: newWidth, height: newHeight },
      })
    }

    const handleMouseUp = () => {
      setResizing(null)
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

/**
 * Hook for rotating box shapes
 */
function useBoxRotation(onUpdate) {
  const [isRotating, setIsRotating] = useState(false)
  const rotateStartRef = useRef(null)

  // Pass the shape element to get its screen position
  const startRotate = (currentRotation, shapeElement) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Get the shape's center in screen coordinates
    const rect = shapeElement.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const startAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    )
    
    rotateStartRef.current = {
      startRotation: currentRotation,
      centerX,
      centerY,
      startAngle,
    }
    setIsRotating(true)
  }

  useEffect(() => {
    if (!isRotating) return

    const handleMouseMove = (e) => {
      if (!rotateStartRef.current) return
      
      const { startRotation, centerX, centerY, startAngle } = rotateStartRef.current
      const currentAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      )
      const deltaAngle = currentAngle - startAngle
      const newRotation = startRotation + (deltaAngle * 180 / Math.PI)
      
      onUpdate({ rotation: newRotation })
    }

    const handleMouseUp = () => {
      setIsRotating(false)
      rotateStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isRotating, onUpdate])

  return { isRotating, startRotate }
}

/**
 * Resize handle component for box shapes
 */
function ResizeHandle({ corner, x, y, onMouseDown, cursor }) {
  return (
    <div
      className="absolute bg-white border-2 border-primary-500 hover:bg-primary-100"
      style={{
        width: RESIZE_HANDLE_SIZE,
        height: RESIZE_HANDLE_SIZE,
        left: x - RESIZE_HANDLE_SIZE / 2,
        top: y - RESIZE_HANDLE_SIZE / 2,
        cursor,
        pointerEvents: 'auto',
      }}
      onMouseDown={onMouseDown}
    />
  )
}

/**
 * Rectangle/Circle/Triangle shape component with custom drag/resize/rotate
 */
function BoxShape({ block, isSelected, isMinimalist, onSelect, onUpdate, onDelete, zoom }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(block.text || '')
  const shapeRef = useRef(null)
  const inputRef = useRef(null)
  const { shapeType, strokeColor = DEFAULT_STROKE_COLOR, strokeWidth = DEFAULT_STROKE_WIDTH, strokeStyle = 'solid', fillColor = 'transparent' } = block
  const width = block.size?.width || 100
  const height = block.size?.height || 100
  const position = block.position || { x: 0, y: 0 }
  const rotation = block.rotation || 0
  const shapeText = block.text || ''
  const dashArray = getStrokeDashArray(strokeStyle, strokeWidth)

  const { isDragging, startDrag } = useBoxDrag(onUpdate, zoom)
  const { resizing, startResize } = useBoxResize(onUpdate, zoom)
  const { isRotating, startRotate } = useBoxRotation(onUpdate)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e) => {
    if (isEditing) {
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    onSelect()
    startDrag(position)(e)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setEditText(shapeText)
    setIsEditing(true)
  }

  const handleTextSubmit = () => {
    onUpdate({ text: editText.trim() })
    setIsEditing(false)
  }

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    } else if (e.key === 'Escape') {
      setEditText(shapeText)
      setIsEditing(false)
    }
    // Shift+Enter allows line break (default textarea behavior)
  }

  const renderSvgShape = () => {
    if (shapeType === 'circle') {
      return (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={(width - strokeWidth) / 2}
          ry={(height - strokeWidth) / 2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          fill={fillColor}
        />
      )
    }
    if (shapeType === 'triangle') {
      const padding = strokeWidth / 2
      const topX = width / 2
      const topY = padding
      const bottomLeftX = padding
      const bottomLeftY = height - padding
      const bottomRightX = width - padding
      const bottomRightY = height - padding
      
      return (
        <polygon
          points={`${topX},${topY} ${bottomLeftX},${bottomLeftY} ${bottomRightX},${bottomRightY}`}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          fill={fillColor}
        />
      )
    }
    return (
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={width - strokeWidth}
        height={height - strokeWidth}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        fill={fillColor}
        rx="2"
      />
    )
  }

  return (
    <>
      {/* Main shape container */}
      <div
        ref={shapeRef}
        className={`absolute ${isSelected ? 'z-10' : 'z-0'}`}
        style={{
          left: position.x,
          top: position.y,
          width,
          height,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
          cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'move',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection ring */}
        <div
          className={`absolute inset-0 ${
            isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : isHovered ? 'ring-1 ring-gray-300' : ''
          }`}
        />
        
        {/* SVG shape */}
        <svg width="100%" height="100%" className="pointer-events-none">
          {renderSvgShape()}
        </svg>

        {/* Text content */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={handleTextKeyDown}
              className="text-center bg-white/90 border border-gray-300 rounded outline-none pointer-events-auto resize-none p-1"
              style={{ 
                color: strokeColor,
                fontSize: 12,
                minWidth: 80,
                minHeight: 24,
              }}
              rows={Math.max(1, editText.split('\n').length)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : shapeText && (
            <span 
              className="text-center select-none whitespace-pre-wrap"
              style={{ 
                color: strokeColor,
                fontSize: 12,
                lineHeight: 1.3,
              }}
            >
              {shapeText}
            </span>
          )}
        </div>

        {/* Resize handles (when selected) */}
        {isSelected && (
          <>
            <ResizeHandle corner="nw" x={0} y={0} cursor="nw-resize" onMouseDown={startResize('nw', { width, height }, position)} />
            <ResizeHandle corner="ne" x={width} y={0} cursor="ne-resize" onMouseDown={startResize('ne', { width, height }, position)} />
            <ResizeHandle corner="sw" x={0} y={height} cursor="sw-resize" onMouseDown={startResize('sw', { width, height }, position)} />
            <ResizeHandle corner="se" x={width} y={height} cursor="se-resize" onMouseDown={startResize('se', { width, height }, position)} />
          </>
        )}

        {/* Delete button */}
        {(isSelected || isHovered) && !isMinimalist && (
          <DeleteButton onClick={onDelete} className="absolute -top-3 -right-3" />
        )}

        {/* Rotation handle (when selected) */}
        {isSelected && (
          <button
            onMouseDown={(e) => {
              if (shapeRef.current) {
                startRotate(rotation, shapeRef.current)(e)
              }
            }}
            className="absolute -top-3 -left-3 w-6 h-6 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-grab active:cursor-grabbing"
            style={{ pointerEvents: 'auto' }}
            title="Rotate"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        )}
      </div>
    </>
  )
}

/**
 * Main ShapeBlock component - routes to appropriate shape renderer
 */
export default function ShapeBlock(props) {
  const { block } = props
  const isLineType = block.shapeType === 'line' || block.shapeType === 'arrow'
  
  return isLineType ? <LineShape {...props} /> : <BoxShape {...props} />
}
