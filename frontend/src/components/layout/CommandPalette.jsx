import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, File, Command, Terminal, Sparkles, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CommandPalette.css';

const CommandPalette = ({ isOpen, onClose, files, commands, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Combine files and commands for searching
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    
    const fileItems = files
      .filter(f => !f.isDirectory && f.name.toLowerCase().includes(q))
      .map(f => ({ id: f.id, name: f.name, type: 'file', icon: <File size={16} /> }));

    const cmdItems = commands
      .filter(c => c.label.toLowerCase().includes(q))
      .map(c => ({ id: c.id, name: c.label, type: 'command', icon: <Command size={16} />, action: c.action }));

    return [...cmdItems, ...fileItems].slice(0, 10);
  }, [query, files, commands]);

  // Handle Keyboard Navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item) => {
    if (item.type === 'file') {
      onFileSelect(item.id);
    } else if (item.type === 'command') {
      item.action();
      onClose();
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('palette-overlay')) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="palette-overlay" onClick={handleBackdropClick}>
          <motion.div 
            className="palette-modal glass-panel"
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="palette-search-wrapper">
              <Search size={20} className="palette-search-icon" />
              <input 
                ref={inputRef}
                type="text" 
                className="palette-input" 
                placeholder="Type to search files or commands (Sync, AI, New...)" 
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
              />
              <div className="palette-hints">
                <kbd>ESC</kbd> to close
              </div>
            </div>

            <div className="palette-list custom-scrollbar" ref={listRef}>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <div 
                    key={`${item.type}-${item.id}`}
                    className={`palette-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="palette-item-icon">
                      {item.icon}
                    </div>
                    <div className="palette-item-info">
                      <span className="palette-item-name">{item.name}</span>
                      <span className="palette-item-type">{item.type}</span>
                    </div>
                    {index === selectedIndex && (
                      <motion.div layoutId="palette-active" className="palette-item-active-glow" />
                    )}
                  </div>
                ))
              ) : (
                <div className="palette-no-results">
                  <Zap size={24} className="no-results-icon" />
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>

            <div className="palette-footer">
              <div className="footer-tip">
                <Command size={12} />
                <span>Use arrows to navigate, Enter to select</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
