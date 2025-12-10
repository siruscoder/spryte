import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { FileText, Bell, Puzzle, Clock } from 'lucide-react';

const ICONS = {
  FileText,
  Bell,
  Puzzle,
  Clock,
};

export default function AddonCommandMenu({
  position,
  templates,
  actions,
  filter,
  onSelectTemplate,
  onSelectAction,
  onClose,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const menuRef = useRef(null);

  // Combine templates and actions into a single list
  const allItems = [
    ...templates.map(t => ({ ...t, type: 'template' })),
    ...actions.map(a => ({ ...a, type: 'action' })),
  ];

  // Filter items based on user input after @
  const filteredItems = filter
    ? allItems.filter(item =>
        item.name.toLowerCase().includes(filter.toLowerCase())
      )
    : allItems;

  // Adjust position to keep menu in viewport
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 10; // Padding from viewport edges
    
    let newX = position.x;
    let newY = position.y;
    
    // Check if menu overflows bottom
    if (position.y + menuRect.height > viewportHeight - padding) {
      // Flip to show above the cursor
      newY = position.y - menuRect.height - 20; // 20px offset for cursor line height
      
      // If flipping up would go above viewport, just pin to bottom
      if (newY < padding) {
        newY = viewportHeight - menuRect.height - padding;
      }
    }
    
    // Check if menu overflows right
    if (position.x + menuRect.width > viewportWidth - padding) {
      newX = viewportWidth - menuRect.width - padding;
    }
    
    // Check if menu overflows left
    if (newX < padding) {
      newX = padding;
    }
    
    setAdjustedPosition({ x: newX, y: newY });
  }, [position, filteredItems.length]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (filteredItems.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const selected = filteredItems[selectedIndex];
          if (selected) {
            if (selected.type === 'template') {
              onSelectTemplate(selected);
            } else {
              onSelectAction(selected);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelectTemplate, onSelectAction, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredItems.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 px-3 text-sm text-gray-500"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          minWidth: '200px',
        }}
      >
        No commands found
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        minWidth: '240px',
        maxHeight: '300px',
        overflowY: 'auto',
      }}
    >
      {/* Templates */}
      {filteredItems
        .filter(item => item.type === 'template')
        .map((item) => {
          const actualIndex = filteredItems.findIndex(i => i === item);
          const IconComponent = ICONS[item.icon] || FileText;
          return (
            <button
              key={`template-${item.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                actualIndex === selectedIndex
                  ? 'bg-primary-50 text-primary-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelectTemplate(item)}
              onMouseEnter={() => setSelectedIndex(actualIndex)}
            >
              <IconComponent className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-400 truncate">{item.addon_name}</div>
              </div>
            </button>
          );
        })}

      {/* Divider between templates and actions */}
      {filteredItems.some(item => item.type === 'template') && 
       filteredItems.some(item => item.type === 'action') && (
        <div className="border-t border-gray-100 my-1" />
      )}

      {/* Actions */}
      {filteredItems
        .filter(item => item.type === 'action')
        .map((item) => {
          const actualIndex = filteredItems.findIndex(i => i === item);
          const IconComponent = ICONS[item.icon] || Bell;
          return (
            <button
              key={`action-${item.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                actualIndex === selectedIndex
                  ? 'bg-primary-50 text-primary-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelectAction(item)}
              onMouseEnter={() => setSelectedIndex(actualIndex)}
            >
              <IconComponent className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-400 truncate">{item.addon_name}</div>
              </div>
            </button>
          );
        })}
    </div>
  );
}
