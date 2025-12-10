import { useCallback, useEffect, useRef, useState } from 'react'
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useNotesStore, useAddonsStore } from '../stores'
import AIInsightPopup from './AIInsightPopup'
import AnnotationPopup from './AnnotationPopup'
import AddonCommandMenu from './AddonCommandMenu'
import { useTextSelection } from '../hooks'

export default function Canvas({ note }) {
  const { saveCanvas, isSaving, addAnnotation, deleteAnnotation } = useNotesStore()
  const { templates, actions, fetchCommands } = useAddonsStore()
  const [editor, setEditor] = useState(null)
  const [insightPopup, setInsightPopup] = useState(null)
  const [annotationPopup, setAnnotationPopup] = useState(null)
  const [annotationIndicators, setAnnotationIndicators] = useState([])
  const [commandMenu, setCommandMenu] = useState(null) // { position, filter }
  const saveTimeoutRef = useRef(null)
  const lastSavedRef = useRef(null)
  const canvasRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const atTriggerRef = useRef(null) // Track @ position for command menu
  
  // Track text selection for AI insight popup
  const { selection, clearSelection } = useTextSelection(canvasRef)

  // Fetch addon commands on mount
  useEffect(() => {
    fetchCommands()
  }, [fetchCommands])

  // Debug: log templates/actions
  useEffect(() => {
    console.log('[Canvas] templates:', templates, 'actions:', actions)
  }, [templates, actions])

  // Initialize editor
  const handleMount = useCallback((editorInstance) => {
    setEditor(editorInstance)
    hasLoadedRef.current = false
  }, [])

  // Load saved canvas data when editor is ready
  useEffect(() => {
    if (!editor || !note) return
    
    // Check if note has saved canvas data
    const canvasData = note.canvas_data
    if (canvasData?.store) {
      try {
        // Extract only shape records from the store
        const shapes = Object.entries(canvasData.store)
          .filter(([key]) => key.startsWith('shape:'))
          .map(([, value]) => value)
        
        // Create shapes in the editor
        if (shapes.length > 0) {
          editor.createShapes(shapes)
        }
      } catch (err) {
        console.error('Failed to load canvas data:', err)
      }
    }
    
    // Mark as loaded after data is restored
    hasLoadedRef.current = true
  }, [editor, note?.id]) // Only reload when editor or note.id changes

  // Autosave functionality
  useEffect(() => {
    if (!editor || !note) return

    const handleChange = () => {
      // Don't save if we haven't finished loading
      if (!hasLoadedRef.current) return
      
      // Debounce saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          const snapshot = editor.store.getSnapshot()
          
          // Only save shapes - nothing else
          const shapesOnly = Object.fromEntries(
            Object.entries(snapshot.store).filter(([key]) => key.startsWith('shape:'))
          )
          
          const canvasData = {
            store: shapesOnly,
          }

          // Only save if changed
          const dataString = JSON.stringify(canvasData)
          if (dataString !== lastSavedRef.current) {
            lastSavedRef.current = dataString
            saveCanvas(note.id, canvasData)
          }
        } catch (err) {
          console.error('Failed to save canvas:', err)
        }
      }, 2000) // Save after 2 seconds of inactivity
    }

    // Subscribe to store changes
    const unsubscribe = editor.store.listen(handleChange, { scope: 'document' })

    return () => {
      unsubscribe()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor, note, saveCanvas])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (editor && note) {
          try {
            const snapshot = editor.store.getSnapshot()
            // Only save shapes
            const shapesOnly = Object.fromEntries(
              Object.entries(snapshot.store).filter(([key]) => key.startsWith('shape:'))
            )
            saveCanvas(note.id, { store: shapesOnly })
          } catch (err) {
            console.error('Failed to save canvas:', err)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor, note, saveCanvas])

  // Show insight popup when text is selected (from useTextSelection hook)
  useEffect(() => {
    if (selection && selection.text.length >= 2) {
      setInsightPopup({
        text: selection.text,
        position: selection.position,
      })
    }
  }, [selection])

  // Track last valid selection text from selectionchange
  const lastSelectionRef = useRef({ text: '', inCanvas: false, shapeId: null })
  
  // Listen for text selection - capture text during selectionchange
  useEffect(() => {
    const handleSelectionChange = () => {
      const windowSelection = window.getSelection()
      const text = windowSelection?.toString().trim() || ''
      
      if (text.length >= 2 && windowSelection.rangeCount > 0) {
        const range = windowSelection.getRangeAt(0)
        const inCanvas = canvasRef.current?.contains(range.commonAncestorContainer) || false
        
        // Try to get the current editing shape ID
        let shapeId = null
        if (editor) {
          const editingShapeId = editor.getEditingShapeId()
          if (editingShapeId) {
            shapeId = editingShapeId
          }
        }
        
        lastSelectionRef.current = { text, inCanvas, shapeId }
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [editor])

  // Show popup on mouseup if we have a valid selection
  useEffect(() => {
    const handleMouseUp = (e) => {
      // Small delay to let selection finalize
      setTimeout(() => {
        const { text, inCanvas, shapeId } = lastSelectionRef.current
        
        if (text.length >= 2 && inCanvas) {
          // Use mouse position since tldraw doesn't give us proper selection bounds
          setInsightPopup({
            text,
            shapeId,
            position: {
              x: e.clientX,
              y: e.clientY + 10,
            },
          })
        }
        
        // Clear for next selection
        lastSelectionRef.current = { text: '', inCanvas: false, shapeId: null }
      }, 50)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Update annotation indicators when editor or annotations change
  useEffect(() => {
    if (!editor || !note?.annotations?.length) {
      setAnnotationIndicators([])
      return
    }

    const updateIndicators = () => {
      const indicators = []
      const annotations = note.annotations || []
      
      // Group annotations by shape_id
      const annotationsByShape = {}
      annotations.forEach(ann => {
        if (ann.shape_id) {
          if (!annotationsByShape[ann.shape_id]) {
            annotationsByShape[ann.shape_id] = []
          }
          annotationsByShape[ann.shape_id].push(ann)
        }
      })

      // Get screen positions for shapes with annotations
      Object.entries(annotationsByShape).forEach(([shapeId, shapeAnnotations]) => {
        const shape = editor.getShape(shapeId)
        if (shape) {
          const bounds = editor.getShapePageBounds(shape)
          if (bounds) {
            const screenPoint = editor.pageToScreen({ x: bounds.maxX, y: bounds.minY })
            indicators.push({
              shapeId,
              annotations: shapeAnnotations,
              position: { x: screenPoint.x, y: screenPoint.y },
            })
          }
        }
      })

      setAnnotationIndicators(indicators)
    }

    // Update on camera changes
    const unsubscribe = editor.store.listen(updateIndicators, { scope: 'document' })
    updateIndicators()

    return () => unsubscribe()
  }, [editor, note?.annotations])

  // Handle attaching insight to the selected text
  const handleAttachInsight = useCallback(async (insightData) => {
    if (!note) return

    const { selectedText, insight, prompt } = insightData
    
    // Save annotation to the note
    try {
      await addAnnotation(note.id, {
        selected_text: selectedText,
        insight: insight,
        shape_id: insightPopup?.shapeId || null,
        prompt: prompt || null,
      })
    } catch (err) {
      console.error('Failed to save annotation:', err)
    }

    clearSelection()
    setInsightPopup(null)
  }, [note, insightPopup, addAnnotation, clearSelection])

  // Detect @ trigger for command menu
  useEffect(() => {
    if (!editor) {
      console.log('[Canvas] No editor yet')
      return
    }
    if (templates.length === 0 && actions.length === 0) {
      console.log('[Canvas] No templates or actions available')
      return
    }

    console.log('[Canvas] Setting up @ detection with', templates.length, 'templates and', actions.length, 'actions')

    const handleInput = (e) => {
      console.log('[Canvas] Input event:', e.data, 'inputType:', e.inputType)
      
      // Check if we're editing a text shape
      const editingShapeId = editor.getEditingShapeId()
      console.log('[Canvas] Editing shape:', editingShapeId)
      if (!editingShapeId) return

      // Check if @ was typed (works with input event data)
      if (e.data === '@') {
        console.log('[Canvas] @ detected!')
        // Get caret position for menu placement
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          
          atTriggerRef.current = {
            shapeId: editingShapeId,
            position: { x: rect.left, y: rect.bottom + 5 },
          }
          
          // Show command menu
          setCommandMenu({
            position: atTriggerRef.current.position,
            filter: '',
            shapeId: editingShapeId,
          })
        }
      }
    }

    const handleKeyDown = (e) => {
      // Only handle keys when command menu is open
      if (!commandMenu) return
      
      if (e.key === 'Backspace') {
        if (commandMenu.filter.length > 0) {
          setCommandMenu(prev => prev ? ({
            ...prev,
            filter: prev.filter.slice(0, -1),
          }) : null)
        } else {
          // Close menu if backspacing past @
          setCommandMenu(null)
        }
        return
      }
      
      if (e.key === 'Escape') {
        setCommandMenu(null)
        return
      }
      
      // Arrow keys and Enter/Tab are handled by AddonCommandMenu
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(e.key)) {
        return
      }
      
      // Add character to filter (ignore special keys)
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && e.key !== '@') {
        setCommandMenu(prev => prev ? ({
          ...prev,
          filter: prev.filter + e.key,
        }) : null)
      }
    }

    // Use capture phase to get events before tldraw
    document.addEventListener('input', handleInput, true)
    document.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      document.removeEventListener('input', handleInput, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editor, templates, actions, commandMenu])

  // Handle template selection
  const handleSelectTemplate = useCallback((template) => {
    if (!editor || !commandMenu?.shapeId) {
      setCommandMenu(null)
      return
    }

    const shape = editor.getShape(commandMenu.shapeId)
    if (!shape || shape.type !== 'text') {
      setCommandMenu(null)
      return
    }

    // Get current text and replace @filter with template content
    const currentText = shape.props.text || ''
    const filterWithAt = '@' + (commandMenu.filter || '')
    const lastAtIndex = currentText.lastIndexOf(filterWithAt)
    
    let newText
    if (lastAtIndex !== -1) {
      newText = currentText.slice(0, lastAtIndex) + template.content
    } else {
      // Fallback: just append template
      newText = currentText + template.content
    }

    // Update the shape
    editor.updateShape({
      id: commandMenu.shapeId,
      type: 'text',
      props: { text: newText },
    })

    setCommandMenu(null)
  }, [editor, commandMenu])

  // Handle action selection
  const handleSelectAction = useCallback((action) => {
    if (!editor || !commandMenu?.shapeId) {
      setCommandMenu(null)
      return
    }

    const shape = editor.getShape(commandMenu.shapeId)
    if (!shape || shape.type !== 'text') {
      setCommandMenu(null)
      return
    }

    // Replace @filter with the action pattern (e.g., @Reminder)
    const currentText = shape.props.text || ''
    const filterWithAt = '@' + (commandMenu.filter || '')
    const lastAtIndex = currentText.lastIndexOf(filterWithAt)
    
    let newText
    if (lastAtIndex !== -1) {
      newText = currentText.slice(0, lastAtIndex) + action.pattern + ' '
    } else {
      newText = currentText + action.pattern + ' '
    }

    editor.updateShape({
      id: commandMenu.shapeId,
      type: 'text',
      props: { text: newText },
    })

    setCommandMenu(null)
  }, [editor, commandMenu])

  return (
    <div 
      ref={canvasRef}
      className="w-full h-full relative"
    >
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute top-4 right-4 z-10 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200 text-sm text-gray-500">
          Saving...
        </div>
      )}

      {/* tldraw canvas - key forces remount when note changes */}
      <Tldraw
        key={note?.id || 'new'}
        onMount={handleMount}
        autoFocus
      />

      {/* Annotation indicators - small badges on shapes with annotations */}
      {annotationIndicators.map((indicator) => (
        <button
          key={indicator.shapeId}
          className="absolute z-20 w-6 h-6 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-colors cursor-pointer"
          style={{
            left: indicator.position.x - 12,
            top: indicator.position.y - 12,
          }}
          onClick={() => setAnnotationPopup({
            annotation: indicator.annotations[0],
            position: indicator.position,
          })}
          title={`${indicator.annotations.length} annotation${indicator.annotations.length > 1 ? 's' : ''}`}
        >
          {indicator.annotations.length}
        </button>
      ))}

      {/* AI Insight Popup (appears when text is highlighted within a shape) */}
      {insightPopup && (
        <AIInsightPopup
          selectedText={insightPopup.text}
          context={note?.title || ''}
          position={insightPopup.position}
          onClose={() => {
            setInsightPopup(null)
            clearSelection()
          }}
          onAttach={handleAttachInsight}
        />
      )}

      {/* Annotation Popup (appears when clicking an annotation indicator) */}
      {annotationPopup && (
        <AnnotationPopup
          annotation={annotationPopup.annotation}
          position={annotationPopup.position}
          onClose={() => setAnnotationPopup(null)}
          onDelete={async (annotationId) => {
            try {
              await deleteAnnotation(note.id, annotationId)
              setAnnotationPopup(null)
            } catch (err) {
              console.error('Failed to delete annotation:', err)
            }
          }}
        />
      )}

      {/* Addon Command Menu (appears when typing @) */}
      {commandMenu && (templates.length > 0 || actions.length > 0) && (
        <AddonCommandMenu
          position={commandMenu.position}
          templates={templates}
          actions={actions}
          filter={commandMenu.filter}
          onSelectTemplate={handleSelectTemplate}
          onSelectAction={handleSelectAction}
          onClose={() => setCommandMenu(null)}
        />
      )}
    </div>
  )
}
