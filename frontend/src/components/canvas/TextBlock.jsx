import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Rnd } from 'react-rnd'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Trash2, Sparkles, Loader2, Lightbulb, FileText, X } from 'lucide-react'
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
  const [showAIActionsToolbar, setShowAIActionsToolbar] = useState(null)
  const [aiPreview, setAiPreview] = useState(null)
  const [selectedText, setSelectedText] = useState('')
  const [commandMenu, setCommandMenu] = useState(null)
  const [reminderDialog, setReminderDialog] = useState(null)
  const [isPolishing, setIsPolishing] = useState(false)
  const blockRef = useRef(null)
  const aiToolbarRef = useRef(null)
  const aiPreviewRef = useRef(null)
  
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
      setShowAIActionsToolbar({
        text,
        position: { x: e.clientX, y: e.clientY + 10 },
        selectionRange: { from, to },
      })
    }
  }, [editor])

  useEffect(() => {
    if (!showAIActionsToolbar && !aiPreview) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAIActionsToolbar(null)
        setAiPreview(null)
        setSelectedText('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showAIActionsToolbar, aiPreview])

  useEffect(() => {
    if (!showAIActionsToolbar && !aiPreview) return

    const closeAIOverlays = () => {
      setShowAIActionsToolbar(null)
      setAiPreview(null)
      setSelectedText('')
    }

    const handleMouseDownCapture = (e) => {
      const toolbarEl = aiToolbarRef.current
      const previewEl = aiPreviewRef.current

      const clickedInsideToolbar = toolbarEl ? toolbarEl.contains(e.target) : false
      const clickedInsidePreview = previewEl ? previewEl.contains(e.target) : false

      if (!clickedInsideToolbar && !clickedInsidePreview) {
        closeAIOverlays()
      }
    }

    const handleSelectionChange = () => {
      const s = window.getSelection()
      const text = s?.toString().trim() || ''
      if (!text) {
        closeAIOverlays()
      }
    }

    document.addEventListener('mousedown', handleMouseDownCapture, true)
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('mousedown', handleMouseDownCapture, true)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [showAIActionsToolbar, aiPreview])

  const runAIActionForSelection = useCallback(async (actionId) => {
    if (!editor || !showAIActionsToolbar?.text || !showAIActionsToolbar?.selectionRange) return

    const { text, position, selectionRange } = showAIActionsToolbar
    setAiPreview({
      actionId,
      isLoading: true,
      error: null,
      resultText: '',
      position,
      selectionRange,
      selectedText: text,
    })

    try {
      const response = await aiApi.transform(text, actionId, block.content || null)
      setAiPreview((prev) => prev ? ({
        ...prev,
        isLoading: false,
        resultText: response.text || '',
      }) : null)
    } catch (err) {
      setAiPreview((prev) => prev ? ({
        ...prev,
        isLoading: false,
        error: err.response?.data?.error || 'AI transformation failed',
      }) : null)
    }
  }, [editor, showAIActionsToolbar])

  const applyAIPreview = useCallback((applyMode) => {
    if (!editor || !aiPreview?.selectionRange || !aiPreview?.resultText) return

    const { from, to } = aiPreview.selectionRange
    const resultText = aiPreview.resultText

    if (applyMode === 'replace') {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(resultText)
        .run()
    }

    if (applyMode === 'append') {
      editor
        .chain()
        .focus()
        .insertContentAt(to, ` (${resultText})`)
        .run()
    }

    setAiPreview(null)
    setShowAIActionsToolbar(null)
    setSelectedText('')
  }, [editor, aiPreview])

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

      {showAIActionsToolbar && !aiPreview && createPortal(
        <div
          className="fixed z-[9999] flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1"
          style={{ left: showAIActionsToolbar.position.x, top: showAIActionsToolbar.position.y }}
          ref={aiToolbarRef}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="p-1.5 rounded transition-colors text-purple-700 hover:bg-purple-50"
            title="AI Insight"
            onClick={() => {
              const payload = showAIActionsToolbar
              setShowInsightPopup({
                text: payload.text,
                position: payload.position,
                selectionRange: payload.selectionRange,
              })
              setShowAIActionsToolbar(null)
            }}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded transition-colors text-amber-700 hover:bg-amber-50"
            title="Clarify"
            onClick={() => runAIActionForSelection('clarify')}
          >
            <Lightbulb className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded transition-colors text-blue-700 hover:bg-blue-50"
            title="Summarize"
            onClick={() => runAIActionForSelection('summarize')}
          >
            <FileText className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            className="p-1.5 rounded transition-colors text-gray-700 hover:bg-gray-100"
            title="Close"
            onClick={() => {
              setShowAIActionsToolbar(null)
              setSelectedText('')
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>,
        document.body
      )}

      {aiPreview && createPortal(
        <div
          className="fixed z-[9999] w-[420px] bg-white border border-gray-200 rounded-lg shadow-xl"
          style={{ left: aiPreview.position.x, top: aiPreview.position.y + 10 }}
          ref={aiPreviewRef}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span>{aiPreview.actionId === 'summarize' ? 'Summarize' : 'Clarify'}</span>
            </div>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-700"
              onClick={() => {
                setAiPreview(null)
                setShowAIActionsToolbar(null)
                setSelectedText('')
              }}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 py-2">
            {aiPreview.isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Working…</span>
              </div>
            )}
            {!aiPreview.isLoading && aiPreview.error && (
              <div className="text-sm text-red-600">{aiPreview.error}</div>
            )}
            {!aiPreview.isLoading && !aiPreview.error && (
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{aiPreview.resultText}</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-200">
            <button
              className="px-2.5 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={() => {
                setAiPreview(null)
                setShowAIActionsToolbar(null)
                setSelectedText('')
              }}
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                className="px-2.5 py-1.5 text-sm rounded bg-primary-600 hover:bg-primary-700 text-white"
                onClick={() => applyAIPreview('replace')}
              >
                Replace selection
              </button>
              <button
                className="px-2.5 py-1.5 text-sm rounded bg-primary-600 hover:bg-primary-700 text-white"
                onClick={() => applyAIPreview('append')}
              >
                Append (in parentheses)
              </button>
            </div>
          </div>
        </div>,
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
