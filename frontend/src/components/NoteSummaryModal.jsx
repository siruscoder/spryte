import { useState } from 'react'
import { X, FileText, Loader2, Copy, Check, PlusSquare } from 'lucide-react'

export default function NoteSummaryModal({ isOpen, onClose, summary, title, isLoading, error, onSaveToCanvas }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Convert HTML to plain text with clear formatting
  const htmlToPlainText = (html) => {
    // Create a temporary element to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Process list items to add bullets/numbers
    temp.querySelectorAll('ul > li').forEach(li => {
      li.textContent = `• ${li.textContent}`
    })
    temp.querySelectorAll('ol').forEach(ol => {
      ol.querySelectorAll('li').forEach((li, index) => {
        li.textContent = `${index + 1}. ${li.textContent}`
      })
    })
    
    // Add line breaks after block elements
    temp.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6').forEach(el => {
      el.textContent = el.textContent + '\n'
    })
    
    // Get text and clean up extra whitespace
    let text = temp.textContent || temp.innerText || ''
    text = text.replace(/\n{3,}/g, '\n\n').trim()
    
    return text
  }

  const handleCopy = async () => {
    if (summary) {
      const plainText = htmlToPlainText(summary)
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-accent-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Note Summary</h2>
              <p className="text-sm text-gray-500 truncate max-w-md">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
              <p className="text-gray-500">Generating summary...</p>
              <p className="text-sm text-gray-400 mt-1">Analyzing your note content</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">Failed to generate summary</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : summary ? (
            <div 
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed
                [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3
                [&>li]:mb-1 [&_strong]:font-semibold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          ) : null}
        </div>

        {/* Footer */}
        {summary && !isLoading && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={() => {
                onSaveToCanvas?.(summary)
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-sm"
            >
              <PlusSquare className="w-4 h-4" />
              Save to Canvas
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
