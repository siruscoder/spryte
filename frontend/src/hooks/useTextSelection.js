import { useState, useEffect, useCallback } from 'react'

export default function useTextSelection(containerRef = null) {
  const [selection, setSelection] = useState(null)

  const handleSelectionChange = useCallback(() => {
    const windowSelection = window.getSelection()
    
    if (!windowSelection || windowSelection.isCollapsed || !windowSelection.toString().trim()) {
      // Don't clear immediately - allow time for popup interaction
      return
    }

    const selectedText = windowSelection.toString().trim()
    
    // Only process if there's meaningful text selected (at least 2 chars)
    if (selectedText.length < 2) {
      return
    }

    // Check if selection is within container (if specified)
    if (containerRef?.current) {
      const range = windowSelection.getRangeAt(0)
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        return
      }
    }

    // Get position for popup
    const range = windowSelection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setSelection({
      text: selectedText,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      },
      range: range.cloneRange(),
    })
  }, [containerRef])

  const clearSelection = useCallback(() => {
    setSelection(null)
  }, [])

  useEffect(() => {
    // Listen for mouseup to detect selection end
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleSelectionChange, 10)
    }

    // Listen for keyup for keyboard-based selection
    const handleKeyUp = (e) => {
      if (e.shiftKey) {
        setTimeout(handleSelectionChange, 10)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleSelectionChange])

  return { selection, clearSelection }
}
