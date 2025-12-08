import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Loader2, Link, Copy, Check } from 'lucide-react'
import { aiApi } from '../api'

export default function AIInsightPopup({ 
  selectedText, 
  context = '', 
  position, 
  onClose, 
  onAttach 
}) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [insight, setInsight] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const popupRef = useRef(null)
  const inputRef = useRef(null)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }

    // Delay adding listener to prevent immediate close
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
    const popupWidth = 320
    const popupHeight = insight ? 400 : 200
    
    let left = position.x
    let top = position.y + 10 // Offset below selection

    // Keep within viewport
    if (left + popupWidth > window.innerWidth - 20) {
      left = window.innerWidth - popupWidth - 20
    }
    if (left < 20) {
      left = 20
    }
    if (top + popupHeight > window.innerHeight - 20) {
      top = position.y - popupHeight - 10 // Show above instead
    }

    return { left, top }
  }

  const handleGetInsight = async () => {
    if (!selectedText.trim()) return

    setIsLoading(true)
    setError(null)
    setInsight(null)

    try {
      // Build the request with context
      const fullContext = context 
        ? `Context: ${context}\n\nSelected text: "${selectedText}"`
        : `Selected text: "${selectedText}"`
      
      const userPrompt = prompt.trim() 
        ? `${prompt}\n\n${fullContext}`
        : `Provide a brief, direct explanation or definition for the following. If it's a name, provide relevant background. If it's a term, explain it clearly. If it's a phrase, analyze its meaning or significance. Do not include follow-up questions, suggestions, or any additional commentary—only the direct insight.\n\n${fullContext}`

      const response = await aiApi.transform(userPrompt, 'insights')
      setInsight(response.text)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get AI insight')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGetInsight()
    }
  }

  const handleCopy = async () => {
    if (insight) {
      await navigator.clipboard.writeText(insight)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAttach = () => {
    if (insight && onAttach) {
      onAttach({
        selectedText,
        insight,
        prompt: prompt || null,
      })
    }
    onClose()
  }

  const adjustedPosition = getAdjustedPosition()

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{
        left: adjustedPosition.left,
        top: adjustedPosition.top,
        width: '320px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">AI Insight</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/50 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Selected text preview */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Selected:</p>
        <p className="text-sm text-gray-800 font-medium line-clamp-2">
          "{selectedText}"
        </p>
      </div>

      {/* Input area */}
      {!insight && !isLoading && (
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Optional: Ask a specific question..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-gray-400"
          />
          
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={handleGetInsight}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Get AI Insight
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Generating insight...</p>
        </div>
      )}

      {/* Insight result */}
      {insight && !isLoading && (
        <div className="p-4">
          <div className="mb-3 p-3 bg-gray-50 rounded-lg max-h-48 overflow-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {insight}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            
            {onAttach && (
              <button
                onClick={handleAttach}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Link className="w-4 h-4" />
                Attach
              </button>
            )}
          </div>

          {/* Try again */}
          <button
            onClick={() => {
              setInsight(null)
              setError(null)
            }}
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Ask differently
          </button>
        </div>
      )}
    </div>
  )
}
