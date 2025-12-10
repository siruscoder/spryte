import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Rnd } from 'react-rnd'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Trash2, Sparkles, Loader2 } from 'lucide-react'
import AnnotationMark from './AnnotationMark'
import ReminderMark from './ReminderMark'
import AIInsightPopup from '../AIInsightPopup'
import AnnotationPopup from '../AnnotationPopup'
import AddonCommandMenu from '../AddonCommandMenu'
import ReminderDialog from '../ReminderDialog'
import { useAddonsStore } from '../../stores'
import { aiApi } from '../../api'

export default function TextBlock({
  block,
  noteId,
  isSelected,
  isMinimalist,
  isDrawingMode,
  annotations,
  onSelect,
  onUpdate,
  onDelete,
  onCreateAnnotation,
  onDeleteAnnotation,
  onReminderDelete,
  zoom,
}) {
  const [showInsightPopup, setShowInsightPopup] = useState(null)
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(null)
  const [selectedText, setSelectedText] = useState('')
  const [commandMenu, setCommandMenu] = useState(null)
  const [reminderDialog, setReminderDialog] = useState(null)
  const [isPolishing, setIsPolishing] = useState(false)
  const blockRef = useRef(null)
  
  const { templates, actions, fetchCommands } = useAddonsStore()
  
  // Fetch commands on mount
  useEffect(() => {
    fetchCommands()
  }, [fetchCommands])

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Enable headings with levels 1-3 (# ## ###)
        heading: {
          levels: [1, 2, 3],
        },
        // Disable code blocks (not needed for notes)
        codeBlock: false,
        // BulletList and OrderedList are enabled by default
        // and support Markdown shortcuts (*, -, 1.)
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      AnnotationMark.configure({
        annotations,
        onAnnotationClick: (annotationId, event) => {
          const annotation = annotations.find(a => a.id === annotationId)
          if (annotation) {
            setShowAnnotationPopup({
              annotation,
              position: { x: event.clientX, y: event.clientY },
            })
          }
        },
      }),
      ReminderMark,
    ],
    content: block.content || '',
    onUpdate: ({ editor }) => {
      onUpdate({ content: editor.getHTML() })
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[60px] p-3 prose prose-sm max-w-none',
      },
    },
  })

  // Update annotations in editor when they change
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'annotationMark') {
          ext.options.annotations = annotations
        }
      })
      // Force re-render to update annotation highlights
      editor.view.dispatch(editor.state.tr)
    }
  }, [editor, annotations])

  // Detect @ for command menu
  useEffect(() => {
    if (!editor) return
    if (templates.length === 0 && actions.length === 0) return

    const handleKeyDown = (event) => {
      // Close menu on escape
      if (event.key === 'Escape' && commandMenu) {
        setCommandMenu(null)
        return
      }
    }

    // Listen for text input to detect @
    const handleTransaction = ({ transaction }) => {
      if (!transaction.docChanged) return
      
      // Get the text that was just inserted
      transaction.steps.forEach(step => {
        if (step.slice && step.slice.content) {
          const insertedText = step.slice.content.textBetween(0, step.slice.content.size)
          
          if (insertedText === '@') {
            // Get cursor position for menu placement
            const { from } = editor.state.selection
            const coords = editor.view.coordsAtPos(from)
            
            setCommandMenu({
              position: { x: coords.left, y: coords.bottom + 5 },
              filter: '',
              atPosition: from - 1, // Position of the @ character
            })
          } else if (commandMenu) {
            // Update filter with typed characters
            if (insertedText.length === 1 && /[a-zA-Z0-9]/.test(insertedText)) {
              setCommandMenu(prev => prev ? ({
                ...prev,
                filter: prev.filter + insertedText,
              }) : null)
            }
          }
        }
      })
    }

    editor.on('transaction', handleTransaction)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      editor.off('transaction', handleTransaction)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, templates, actions, commandMenu])

  // Track reminder IDs in content and delete when removed
  const previousReminderIdsRef = useRef(new Set())
  
  useEffect(() => {
    if (!editor) return
    
    const checkReminderDeletions = () => {
      // Get current reminder IDs from the HTML content
      const html = editor.getHTML()
      const currentIds = new Set()
      const regex = /data-reminder-id="([^"]+)"/g
      let match
      while ((match = regex.exec(html)) !== null) {
        currentIds.add(match[1])
      }
      
      // Find IDs that were removed
      const previousIds = previousReminderIdsRef.current
      for (const id of previousIds) {
        if (!currentIds.has(id)) {
          // This reminder was deleted from the content
          import('../../api/reminders').then(({ remindersApi }) => {
            remindersApi.delete(id).catch(err => {
              console.error('Failed to delete reminder:', err)
            })
          })
        }
      }
      
      previousReminderIdsRef.current = currentIds
    }
    
    // Check on content changes
    const handleUpdate = () => {
      checkReminderDeletions()
    }
    
    editor.on('update', handleUpdate)
    
    // Initial check
    checkReminderDeletions()
    
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor])

  // Handle template selection
  const handleSelectTemplate = useCallback((template) => {
    if (!editor || !commandMenu) {
      setCommandMenu(null)
      return
    }

    // Delete the @filter text and insert template content
    const { atPosition, filter } = commandMenu
    const deleteLength = 1 + filter.length // @ + filter
    
    // Handle inline templates (like @Now)
    if (template.is_inline) {
      let insertText = ''
      
      // Special handling for @Now - insert current date/time
      if (template.id === 'now') {
        const now = new Date()
        insertText = now.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      } else {
        insertText = template.pattern || ''
      }
      
      editor
        .chain()
        .focus()
        .deleteRange({ from: atPosition, to: atPosition + deleteLength })
        .insertContent(insertText)
        .run()
      
      setCommandMenu(null)
      return
    }

    // Regular template - insert content block
    editor
      .chain()
      .focus()
      .deleteRange({ from: atPosition, to: atPosition + deleteLength })
      .insertContent(template.content)
      .run()

    setCommandMenu(null)
  }, [editor, commandMenu])

  // Handle action selection
  const handleSelectAction = useCallback((action) => {
    if (!editor || !commandMenu) {
      setCommandMenu(null)
      return
    }

    const { atPosition, filter, position: menuPosition } = commandMenu
    const deleteLength = 1 + filter.length // @ + filter

    // Special handling for reminder action - show dialog
    if (action.id === 'reminder') {
      // Delete the @filter text first
      editor
        .chain()
        .focus()
        .deleteRange({ from: atPosition, to: atPosition + deleteLength })
        .run()

      // Use the command menu position for the dialog
      setReminderDialog({
        position: menuPosition,
        insertPosition: atPosition,
      })
      setCommandMenu(null)
      return
    }
    
    // For other actions, use template if available, otherwise just the pattern
    const insertText = action.template || (action.pattern + ' ')
    
    editor
      .chain()
      .focus()
      .deleteRange({ from: atPosition, to: atPosition + deleteLength })
      .insertContent(insertText)
      .run()

    setCommandMenu(null)
  }, [editor, commandMenu])

  // Handle reminder save
  const handleReminderSave = useCallback((reminderData) => {
    if (!editor) return

    // Insert the reminder text with the reminderMark
    // The ReminderMark extension will parse and render this correctly
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: reminderData.text,
        marks: [
          {
            type: 'reminderMark',
            attrs: {
              'data-reminder-id': reminderData.reminderId,
            },
          },
        ],
      })
      .insertContent(' ')
      .run()

    setReminderDialog(null)
  }, [editor])

  // Handle text selection for AI insights
  const handleMouseUp = useCallback((e) => {
    if (!editor) return

    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.length >= 2) {
      // Capture the editor selection range before it's lost
      const { from, to } = editor.state.selection
      
      setSelectedText(text)
      setShowInsightPopup({
        text,
        position: { x: e.clientX, y: e.clientY + 10 },
        selectionRange: { from, to }, // Store for later use when attaching
      })
    }
  }, [editor])

  // Handle attaching insight as annotation
  const handleAttachInsight = useCallback(async (insightData) => {
    const { selectedText, insight, prompt } = insightData
    const selectionRange = showInsightPopup?.selectionRange

    try {
      // Create annotation and get the ID back
      const annotation = await onCreateAnnotation(selectedText, insight, prompt)
      
      // Apply annotation mark to the selected text in editor
      if (editor && selectionRange && annotation?.id) {
        const { from, to } = selectionRange
        if (from !== to) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .setAnnotation(annotation.id)
            .run()
        }
      }
    } catch (err) {
      console.error('Failed to attach insight:', err)
    }

    setShowInsightPopup(null)
    setSelectedText('')
  }, [editor, onCreateAnnotation, showInsightPopup])

  // Handle delete annotation
  const handleDeleteAnnotation = useCallback(async (annotationId) => {
    try {
      await onDeleteAnnotation(annotationId)
      setShowAnnotationPopup(null)
    } catch (err) {
      console.error('Failed to delete annotation:', err)
    }
  }, [onDeleteAnnotation])

  // Handle polish text with AI
  const handlePolish = useCallback(async () => {
    if (!editor || isPolishing) return
    
    setIsPolishing(true)
    try {
      // Get HTML content to preserve structure
      const currentHtml = editor.getHTML()
      if (!currentHtml.trim() || currentHtml === '<p></p>') {
        setIsPolishing(false)
        return
      }
      
      // Extract annotation spans before polishing (to re-apply after)
      const annotationRegex = /<span[^>]*data-annotation-id="([^"]+)"[^>]*>([^<]*)<\/span>/g
      const annotationMap = new Map()
      let match
      while ((match = annotationRegex.exec(currentHtml)) !== null) {
        const [, annotationId, annotatedText] = match
        annotationMap.set(annotatedText.toLowerCase(), annotationId)
      }
      
      // Remove annotation spans before sending to AI (to simplify the HTML)
      const htmlWithoutAnnotations = currentHtml.replace(
        /<span[^>]*data-annotation-id="[^"]*"[^>]*>([^<]*)<\/span>/g,
        '$1'
      )
      
      // Call AI to polish the HTML
      const result = await aiApi.transform(htmlWithoutAnnotations, 'polish')
      
      if (result.text) {
        let polishedHtml = result.text
        
        // Re-apply annotations if the annotated text still exists in polished version
        for (const [text, annotationId] of annotationMap) {
          const regex = new RegExp(`(${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
          polishedHtml = polishedHtml.replace(regex, `<span data-annotation-id="${annotationId}" class="annotation-highlight">$1</span>`)
        }
        
        editor.commands.setContent(polishedHtml)
      }
    } catch (err) {
      console.error('Failed to polish text:', err)
    } finally {
      setIsPolishing(false)
    }
  }, [editor, isPolishing])

  return (
    <>
      <div style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
      <Rnd
        ref={blockRef}
        size={{ width: block.width, height: block.height }}
        position={{ x: block.x, y: block.y }}
        onDragStop={(e, d) => {
          onUpdate({ x: d.x, y: d.y })
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          onUpdate({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
            x: position.x,
            y: position.y,
          })
        }}
        minWidth={150}
        minHeight={60}
        scale={zoom}
        disableDragging={isDrawingMode}
        enableResizing={isSelected && !isDrawingMode}
        onMouseDown={(e) => {
          if (isDrawingMode) return
          e.stopPropagation()
          onSelect()
        }}
        className={`
          rounded-lg transition-colors
          ${isMinimalist 
            ? (isSelected 
                ? 'border border-primary-500 shadow-sm' 
                : 'border border-gray-100 shadow-none hover:border-gray-300')
            : (isSelected 
                ? 'border-2 border-primary-500 shadow-lg' 
                : 'border-2 border-transparent shadow-md hover:border-gray-300')
          }
        `}
        style={{ backgroundColor: block.backgroundColor || '#ffffff' }}
        dragHandleClassName="drag-handle"
      >
        <div className="w-full h-full flex flex-col">
          {/* Drag handle header */}
          <div 
            className="drag-handle h-6 border-b border-gray-200 cursor-move flex items-center justify-between px-2 rounded-t-lg"
            style={{ backgroundColor: block.backgroundColor ? `color-mix(in srgb, ${block.backgroundColor} 70%, #9ca3af 30%)` : '#f9fafb' }}
          >
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="w-2 h-2 rounded-full bg-gray-300" />
            </div>
            {/* Polish button */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                handlePolish()
              }}
              disabled={isPolishing}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Polish text for clarity and brevity"
            >
              {isPolishing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>Polish</span>
            </button>
          </div>
          
          {/* Editor content */}
          <div 
            className="flex-1 overflow-auto"
            onMouseUp={(e) => {
              // First check if clicked on an annotation highlight
              const target = e.target
              const annotationEl = target.closest('[data-annotation-id]')
              
              if (annotationEl) {
                const annotationId = annotationEl.getAttribute('data-annotation-id')
                if (annotationId) {
                  const annotation = annotations.find(a => a.id === annotationId)
                  if (annotation) {
                    e.stopPropagation()
                    e.preventDefault()
                    setShowAnnotationPopup({
                      annotation,
                      position: { x: e.clientX, y: e.clientY + 10 },
                    })
                    return
                  }
                }
              }
              
              // Otherwise handle text selection for AI insights
              handleMouseUp(e)
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Delete button - only show when selected */}
        {isSelected && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-50"
            title="Delete block"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </Rnd>
      </div>

      {/* AI Insight Popup - rendered via portal to escape transform context */}
      {showInsightPopup && createPortal(
        <AIInsightPopup
          selectedText={showInsightPopup.text}
          context={block.content || ''}
          position={showInsightPopup.position}
          onClose={() => {
            setShowInsightPopup(null)
            setSelectedText('')
          }}
          onAttach={handleAttachInsight}
        />,
        document.body
      )}

      {/* Annotation Popup - rendered via portal to escape transform context */}
      {showAnnotationPopup && createPortal(
        <AnnotationPopup
          annotation={showAnnotationPopup.annotation}
          position={showAnnotationPopup.position}
          onClose={() => setShowAnnotationPopup(null)}
          onDelete={handleDeleteAnnotation}
        />,
        document.body
      )}

      {/* Addon Command Menu - rendered via portal */}
      {commandMenu && (templates.length > 0 || actions.length > 0) && createPortal(
        <AddonCommandMenu
          position={commandMenu.position}
          templates={templates}
          actions={actions}
          filter={commandMenu.filter}
          onSelectTemplate={handleSelectTemplate}
          onSelectAction={handleSelectAction}
          onClose={() => setCommandMenu(null)}
        />,
        document.body
      )}

      {/* Reminder Dialog - rendered via portal */}
      {reminderDialog && createPortal(
        <ReminderDialog
          position={reminderDialog.position}
          noteId={noteId}
          blockId={block.id}
          onClose={() => setReminderDialog(null)}
          onSave={handleReminderSave}
        />,
        document.body
      )}
    </>
  )
}
