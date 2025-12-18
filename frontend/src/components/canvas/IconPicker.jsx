import { useState, useMemo, useEffect } from 'react'
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

// Get all available icon names from lucide-react
// Icon components start with uppercase letters and are React components
const ICON_NAMES = Object.keys(LucideIcons).filter(name => {
  // Must start with uppercase letter (React component convention)
  if (!/^[A-Z]/.test(name)) {
    return false
  }
  
  // Skip names ending with 'Icon' suffix (duplicates)
  if (name.endsWith('Icon')) {
    return false
  }
  
  // Filter out known non-icon exports
  const excludedNames = ['createLucideIcon', 'Icon', 'IconNode', 'LucideProps', 'LucideIcon']
  if (excludedNames.includes(name)) {
    return false
  }
  
  const component = LucideIcons[name]
  // Must be a valid component (object or function)
  if (!component || (typeof component !== 'function' && typeof component !== 'object')) {
    return false
  }
  
  return true
})

export default function IconPicker({ onSelect, onClose, position }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [pageOffset, setPageOffset] = useState(0)

  useEffect(() => {
    setPageOffset(0)
  }, [searchQuery])

  const allMatchingIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return ICON_NAMES
    }
    const query = searchQuery.toLowerCase()
    return ICON_NAMES.filter(name => name.toLowerCase().includes(query))
  }, [searchQuery])

  const filteredIcons = useMemo(() => {
    return allMatchingIcons.slice(pageOffset, pageOffset + 100)
  }, [allMatchingIcons, pageOffset])

  const totalMatching = allMatchingIcons.length
  const startNumber = totalMatching === 0 ? 0 : pageOffset + 1
  const endNumber = Math.min(pageOffset + filteredIcons.length, totalMatching)
  const canPrev = pageOffset > 0
  const canNext = pageOffset + 100 < totalMatching

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col"
        style={{
          left: position?.x || '50%',
          top: position?.y || '50%',
          transform: position ? 'translate(0, 0)' : 'translate(-50%, -50%)',
          width: 480,
          maxHeight: 600,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Icon</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search icons..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Showing {startNumber}-{endNumber} of {totalMatching} icon{totalMatching !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`p-1 rounded transition-colors ${canPrev ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                onClick={() => {
                  if (!canPrev) return
                  setPageOffset((prev) => Math.max(0, prev - 100))
                }}
                title="Previous 100"
                disabled={!canPrev}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={`p-1 rounded transition-colors ${canNext ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                onClick={() => {
                  if (!canNext) return
                  setPageOffset((prev) => Math.min(Math.max(0, totalMatching - 100), prev + 100))
                }}
                title="Next 100"
                disabled={!canNext}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-8 gap-2">
            {filteredIcons.map((iconName) => {
              const IconComponent = LucideIcons[iconName]
              return (
                <button
                  key={iconName}
                  onClick={() => onSelect(iconName)}
                  className="p-3 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center group relative"
                  title={iconName}
                >
                  <IconComponent className="w-6 h-6 text-gray-700 group-hover:text-primary-600" />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                    {iconName}
                  </div>
                </button>
              )
            })}
          </div>
          
          {filteredIcons.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No icons found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
