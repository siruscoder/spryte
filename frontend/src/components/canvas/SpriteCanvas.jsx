import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Minus, Plus, Maximize, ZoomIn } from 'lucide-react'
import TextBlock from './TextBlock'
import ShapeBlock from './ShapeBlock'
import { useNotesStore, useAuthStore } from '../../stores'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2

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

const SpriteCanvas = forwardRef(({ 
  note, 
  activeDrawingShape, 
  onDrawingShapeChange,
  strokeColor = '#374151',
  strokeWidth = 2,
  strokeStyle = 'solid',
  fillColor = 'transparent',
  onSelectedShapeChange,
}, ref) => {
  const { saveCanvas, isSaving, addAnnotation, deleteAnnotation } = useNotesStore()
  const { user } = useAuthStore()
  const isMinimalist = user?.settings?.canvas_minimalist || false
  
  // Canvas state
  const [blocks, setBlocks] = useState([])
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [isPanning, setIsPanning] = useState(false)
  const [annotations, setAnnotations] = useState([])
  
  // Drawing state for click-and-drag shape creation
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingShape, setDrawingShape] = useState(null) // { startX, startY, currentX, currentY }
  
  const containerRef = useRef(null)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const saveTimeoutRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const lastSavedDataRef = useRef(null) // For dirty checking

  // Load canvas data when note changes
  useEffect(() => {
    if (!note) {
      setBlocks([])
      setAnnotations([])
      hasLoadedRef.current = false
      return
    }

    // Load blocks from canvas_data
    const canvasData = note.canvas_data || {}
    
    if (canvasData.blocks) {
      setBlocks(canvasData.blocks)
    } else {
      setBlocks([])
    }
    
    if (canvasData.camera) {
      setCamera(canvasData.camera)
    } else {
      setCamera({ x: 0, y: 0, zoom: 1 })
    }

    // Load annotations
    setAnnotations(note.annotations || [])
    
    hasLoadedRef.current = true
  }, [note?.id])

  // Update annotations when note.annotations changes
  useEffect(() => {
    if (note?.annotations) {
      setAnnotations(note.annotations)
    }
  }, [note?.annotations])

  // Auto-save with debounce and dirty check
  const triggerSave = useCallback(() => {
    if (!note || !hasLoadedRef.current) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const canvasData = {
        blocks,
        camera,
        version: 2, // New canvas format
      }
      
      // Dirty check - only save if data actually changed
      const dataString = JSON.stringify(canvasData)
      if (dataString === lastSavedDataRef.current) {
        return // No changes, skip save
      }
      
      lastSavedDataRef.current = dataString
      saveCanvas(note.id, canvasData)
    }, 4000) // 4 second debounce
  }, [note, blocks, camera, saveCanvas])

  // Trigger save when blocks change
  useEffect(() => {
    if (hasLoadedRef.current && blocks.length >= 0) {
      triggerSave()
    }
  }, [blocks, triggerSave])

  // Create new text block on double-click
  const handleDoubleClick = useCallback((e) => {
    if (e.target !== containerRef.current && !e.target.classList.contains('canvas-background')) {
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - camera.x) / camera.zoom
    const y = (e.clientY - rect.top - camera.y) / camera.zoom

    const newBlock = {
      id: uuidv4(),
      type: 'text',
      x,
      y,
      width: 450,
      height: 180,
      content: '',
    }

    setBlocks(prev => [...prev, newBlock])
    setSelectedBlockId(newBlock.id)
  }, [camera])

  // Pan handling and drawing
  const handleMouseDown = useCallback((e) => {
    // If drawing mode is active, start drawing a shape
    if (activeDrawingShape && e.button === 0) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - camera.x) / camera.zoom
      const y = (e.clientY - rect.top - camera.y) / camera.zoom
      
      setIsDrawing(true)
      setDrawingShape({
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      })
      e.preventDefault()
      return
    }
    
    // Only pan with middle mouse or when holding space
    if (e.button === 1 || (e.button === 0 && e.target === containerRef.current)) {
      if (e.target === containerRef.current || e.target.classList.contains('canvas-background')) {
        setIsPanning(true)
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
      }
    }
  }, [activeDrawingShape, camera])

  const handleMouseMove = useCallback((e) => {
    // Update drawing shape preview
    if (isDrawing && drawingShape) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - camera.x) / camera.zoom
      const y = (e.clientY - rect.top - camera.y) / camera.zoom
      
      setDrawingShape(prev => ({
        ...prev,
        currentX: x,
        currentY: y,
      }))
      return
    }
    
    if (!isPanning) return

    const dx = e.clientX - lastMouseRef.current.x
    const dy = e.clientY - lastMouseRef.current.y
    
    setCamera(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }))

    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [isPanning, isDrawing, drawingShape, camera])

  const handleMouseUp = useCallback(() => {
    // Finish drawing shape
    if (isDrawing && drawingShape && activeDrawingShape) {
      const { startX, startY, currentX, currentY } = drawingShape
      
      // Only create shape if there's meaningful distance
      const dx = currentX - startX
      const dy = currentY - startY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) { // Minimum 5px to create a shape
        let newBlock = {
          id: uuidv4(),
          type: 'shape',
          shapeType: activeDrawingShape,
          strokeColor: strokeColor,
          strokeWidth: strokeWidth,
          strokeStyle: strokeStyle,
          fillColor: fillColor,
        }
        
        if (activeDrawingShape === 'line' || activeDrawingShape === 'arrow') {
          // Lines/arrows use start and end points
          newBlock = {
            ...newBlock,
            position: { x: Math.min(startX, currentX), y: Math.min(startY, currentY) },
            startPoint: { x: startX - Math.min(startX, currentX), y: startY - Math.min(startY, currentY) },
            endPoint: { x: currentX - Math.min(startX, currentX), y: currentY - Math.min(startY, currentY) },
          }
        } else {
          // Circles and rectangles use position and size
          const width = Math.abs(currentX - startX)
          const height = Math.abs(currentY - startY)
          newBlock = {
            ...newBlock,
            position: { x: Math.min(startX, currentX), y: Math.min(startY, currentY) },
            size: { width: Math.max(width, 20), height: Math.max(height, 20) },
          }
        }
        
        setBlocks(prev => [...prev, newBlock])
        setSelectedBlockId(newBlock.id)
        
        // Exit drawing mode after creating a shape
        if (onDrawingShapeChange) {
          onDrawingShapeChange(null)
        }
      }
      
      setIsDrawing(false)
      setDrawingShape(null)
      return
    }
    
    setIsPanning(false)
  }, [isDrawing, drawingShape, activeDrawingShape, strokeColor, strokeWidth, strokeStyle, fillColor, onDrawingShapeChange])

  // Zoom handling
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * zoomFactor))

    // Zoom toward mouse position
    const scale = newZoom / camera.zoom
    const newX = mouseX - (mouseX - camera.x) * scale
    const newY = mouseY - (mouseY - camera.y) * scale

    setCamera({
      x: newX,
      y: newY,
      zoom: newZoom,
    })
  }, [camera])

  // Zoom to fit
  const zoomToFit = useCallback(() => {
    if (blocks.length === 0) {
      setCamera({ x: 0, y: 0, zoom: 1 })
      return
    }

    // Calculate bounding box of all blocks
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    blocks.forEach(block => {
      minX = Math.min(minX, block.x)
      minY = Math.min(minY, block.y)
      maxX = Math.max(maxX, block.x + block.width)
      maxY = Math.max(maxY, block.y + block.height)
    })

    // Add padding
    const padding = 50
    const width = maxX - minX + padding * 2
    const height = maxY - minY + padding * 2
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Calculate zoom to fit
    const zoomX = containerRect.width / width
    const zoomY = containerRect.height / height
    const zoom = Math.min(Math.min(zoomX, zoomY), 1) // Don't zoom in past 100% automatically

    // Center content
    const x = (containerRect.width - width * zoom) / 2 - minX * zoom + padding * zoom
    const y = (containerRect.height - height * zoom) / 2 - minY * zoom + padding * zoom

    setCamera({ x, y, zoom })
  }, [blocks])

  // Update block position/size
  const handleBlockUpdate = useCallback((id, updates) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ))
  }, [])

  // Delete block and any reminders it contains
  const handleBlockDelete = useCallback((id) => {
    // Find the block to get its content and extract reminder IDs
    const blockToDelete = blocks.find(b => b.id === id)
    if (blockToDelete && blockToDelete.content) {
      // Extract reminder IDs from the content
      const regex = /data-reminder-id="([^"]+)"/g
      let match
      while ((match = regex.exec(blockToDelete.content)) !== null) {
        const reminderId = match[1]
        // Delete the reminder
        import('../../api/reminders').then(({ remindersApi }) => {
          remindersApi.delete(reminderId).catch(err => {
            console.error('Failed to delete reminder:', err)
          })
        })
      }
    }
    
    setBlocks(prev => prev.filter(block => block.id !== id))
    if (selectedBlockId === id) {
      setSelectedBlockId(null)
    }
  }, [selectedBlockId, blocks])

  // Handle Escape key to cancel drawing mode, Delete/Backspace to delete selected shape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeDrawingShape && onDrawingShapeChange) {
        onDrawingShapeChange(null)
      }
      
      // Delete selected shape with Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        // Only delete if not focused on an input/textarea/contenteditable
        const activeElement = document.activeElement
        const isEditing = activeElement?.tagName === 'INPUT' || 
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.isContentEditable ||
                          activeElement?.closest('.ProseMirror')
        
        if (!isEditing) {
          const selectedBlock = blocks.find(b => b.id === selectedBlockId)
          if (selectedBlock?.type === 'shape') {
            e.preventDefault()
            handleBlockDelete(selectedBlockId)
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeDrawingShape, onDrawingShapeChange, selectedBlockId, blocks, handleBlockDelete])

  // Notify parent when selected shape changes
  useEffect(() => {
    if (onSelectedShapeChange) {
      const selectedBlock = blocks.find(b => b.id === selectedBlockId)
      if (selectedBlock?.type === 'shape') {
        onSelectedShapeChange(selectedBlock)
      } else {
        onSelectedShapeChange(null)
      }
    }
  }, [selectedBlockId, blocks, onSelectedShapeChange])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    updateSelectedShape: (updates) => {
      if (selectedBlockId) {
        handleBlockUpdate(selectedBlockId, updates)
      }
    },
    getBlocks: () => blocks,
    addSummaryBlock: (htmlContent) => {
      // Find a good position for the summary block (top-right area, avoiding existing blocks)
      const existingBlocks = blocks.filter(b => b.type !== 'shape')
      let x = 50
      let y = 50
      
      if (existingBlocks.length > 0) {
        // Find the rightmost block and place summary to its right
        const rightmostBlock = existingBlocks.reduce((max, b) => 
          (b.x + (b.width || 300)) > (max.x + (max.width || 300)) ? b : max
        , existingBlocks[0])
        x = rightmostBlock.x + (rightmostBlock.width || 300) + 30
        y = 50
        
        // If too far right, place below all blocks instead
        if (x > 800) {
          const bottomBlock = existingBlocks.reduce((max, b) => 
            (b.y + (b.height || 200)) > (max.y + (max.height || 200)) ? b : max
          , existingBlocks[0])
          x = 50
          y = bottomBlock.y + (bottomBlock.height || 200) + 30
        }
      }
      
      const summaryBlock = {
        id: uuidv4(),
        type: 'text',
        x,
        y,
        width: 400,
        height: 300,
        content: `<p><strong>📋 Summary</strong></p>${htmlContent}`,
        backgroundColor: '#fef9c3', // Light yellow (Tailwind yellow-100)
      }
      
      setBlocks(prev => [...prev, summaryBlock])
      setSelectedBlockId(summaryBlock.id)
    },
  }), [selectedBlockId, handleBlockUpdate, blocks])

  // Handle annotation creation
  const handleCreateAnnotation = useCallback(async (blockId, selectedText, insight, prompt) => {
    if (!note) return

    try {
      const annotation = await addAnnotation(note.id, {
        selected_text: selectedText,
        insight,
        block_id: blockId,
        prompt: prompt || null,
      })
      return annotation
    } catch (err) {
      console.error('Failed to create annotation:', err)
      throw err
    }
  }, [note, addAnnotation])

  // Handle annotation deletion
  const handleDeleteAnnotation = useCallback(async (annotationId) => {
    if (!note) return

    try {
      await deleteAnnotation(note.id, annotationId)
    } catch (err) {
      console.error('Failed to delete annotation:', err)
      throw err
    }
  }, [note, deleteAnnotation])

  // Click outside to deselect (drawing is handled by mouseDown/mouseUp)
  const handleCanvasClick = useCallback((e) => {
    if (e.target === containerRef.current || e.target.classList.contains('canvas-background')) {
      // Don't deselect if we just finished drawing
      if (activeDrawingShape) return
      setSelectedBlockId(null)
    }
  }, [activeDrawingShape])

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden relative bg-gray-50"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning ? 'grabbing' : activeDrawingShape ? 'crosshair' : 'default' }}
    >
      {/* Drawing overlay - captures all mouse events when drawing */}
      {activeDrawingShape && (
        <div 
          className="absolute inset-0 z-40"
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => {
            e.stopPropagation()
            handleMouseDown(e)
          }}
          onMouseMove={(e) => {
            e.stopPropagation()
            handleMouseMove(e)
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            handleMouseUp(e)
          }}
        />
      )}
      
      {/* Grid background */}
      {!isMinimalist && (
        <div 
          className="canvas-background absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px`,
            backgroundPosition: `${camera.x}px ${camera.y}px`,
          }}
        />
      )}

      {/* Transformed content layer */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        }}
      >
        {/* Render text blocks first (bottom layer) */}
        {blocks
          .filter(block => block.type !== 'shape')
          .map(block => (
            <TextBlock
              key={block.id}
              block={block}
              noteId={note?.id}
              isSelected={selectedBlockId === block.id}
              isMinimalist={isMinimalist}
              isDrawingMode={!!activeDrawingShape}
              annotations={annotations.filter(a => a.block_id === block.id)}
              onSelect={() => setSelectedBlockId(block.id)}
              onUpdate={(updates) => handleBlockUpdate(block.id, updates)}
              onDelete={() => handleBlockDelete(block.id)}
              onCreateAnnotation={(text, insight, prompt) => 
                handleCreateAnnotation(block.id, text, insight, prompt)
              }
              onDeleteAnnotation={handleDeleteAnnotation}
              zoom={camera.zoom}
            />
          ))}
        
        {/* Render shape blocks on top */}
        {blocks
          .filter(block => block.type === 'shape')
          .map(block => (
            <ShapeBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              isMinimalist={isMinimalist}
              onSelect={() => setSelectedBlockId(block.id)}
              onUpdate={(updates) => handleBlockUpdate(block.id, updates)}
              onDelete={() => handleBlockDelete(block.id)}
              zoom={camera.zoom}
            />
          ))}
      </div>

      {/* Drawing preview while dragging - rendered above everything */}
      {isDrawing && drawingShape && activeDrawingShape && (
        <svg
          className="absolute pointer-events-none z-50"
          style={{
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          {(activeDrawingShape === 'line' || activeDrawingShape === 'arrow') && (
            <>
              {activeDrawingShape === 'arrow' && (
                <defs>
                  <marker
                    id="preview-arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 5, 0 10" fill={strokeColor} />
                  </marker>
                </defs>
              )}
              <line
                x1={drawingShape.startX * camera.zoom + camera.x}
                y1={drawingShape.startY * camera.zoom + camera.y}
                x2={drawingShape.currentX * camera.zoom + camera.x}
                y2={drawingShape.currentY * camera.zoom + camera.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={getStrokeDashArray(strokeStyle, strokeWidth)}
                markerEnd={activeDrawingShape === 'arrow' ? 'url(#preview-arrowhead)' : undefined}
              />
            </>
          )}
          {activeDrawingShape === 'rectangle' && (
            <rect
              x={Math.min(drawingShape.startX, drawingShape.currentX) * camera.zoom + camera.x}
              y={Math.min(drawingShape.startY, drawingShape.currentY) * camera.zoom + camera.y}
              width={Math.abs(drawingShape.currentX - drawingShape.startX) * camera.zoom}
              height={Math.abs(drawingShape.currentY - drawingShape.startY) * camera.zoom}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={getStrokeDashArray(strokeStyle, strokeWidth)}
              fill={fillColor}
              rx="2"
            />
          )}
          {activeDrawingShape === 'circle' && (
            <ellipse
              cx={(drawingShape.startX + drawingShape.currentX) / 2 * camera.zoom + camera.x}
              cy={(drawingShape.startY + drawingShape.currentY) / 2 * camera.zoom + camera.y}
              rx={Math.abs(drawingShape.currentX - drawingShape.startX) / 2 * camera.zoom}
              ry={Math.abs(drawingShape.currentY - drawingShape.startY) / 2 * camera.zoom}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={getStrokeDashArray(strokeStyle, strokeWidth)}
              fill={fillColor}
            />
          )}
          {activeDrawingShape === 'triangle' && (
            <polygon
              points={`${(drawingShape.startX + drawingShape.currentX) / 2 * camera.zoom + camera.x},${Math.min(drawingShape.startY, drawingShape.currentY) * camera.zoom + camera.y} ${Math.min(drawingShape.startX, drawingShape.currentX) * camera.zoom + camera.x},${Math.max(drawingShape.startY, drawingShape.currentY) * camera.zoom + camera.y} ${Math.max(drawingShape.startX, drawingShape.currentX) * camera.zoom + camera.x},${Math.max(drawingShape.startY, drawingShape.currentY) * camera.zoom + camera.y}`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={getStrokeDashArray(strokeStyle, strokeWidth)}
              fill={fillColor}
            />
          )}
        </svg>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute bottom-4 left-4 z-50 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200 text-sm text-gray-500">
          Saving...
        </div>
      )}

      {/* Drawing mode indicator */}
      {activeDrawingShape && !isDrawing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
          Click and drag to draw {activeDrawingShape} • Press Esc to cancel
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={zoomToFit}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom to fit"
        >
          <Maximize className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom - 0.1) }))}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-gray-600 w-12 text-center select-none">
          {Math.round(camera.zoom * 100)}%
        </span>
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom + 0.1) }))}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Help text */}
      {blocks.length === 0 && !activeDrawingShape && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-gray-400 text-center">
            <p className="text-lg">Double-click to create a text block</p>
            <p className="text-sm mt-2">Ctrl/Cmd + scroll to zoom • Drag canvas to pan</p>
          </div>
        </div>
      )}
    </div>
  )
})

export default SpriteCanvas
