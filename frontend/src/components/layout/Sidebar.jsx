import React, { useState } from 'react';
import { Folder, Search, Settings, Code2, Users, ChevronRight, X, Type, AlignLeft, Map, ToggleLeft, ToggleRight, Hash } from 'lucide-react';
import FileExplorer from '../file-system/FileExplorer';
import ChatAssistant from '../ai/ChatAssistant';
import { useSettingsStore } from '../../store/useSettingsStore';
import './Sidebar.css';

// ─── Search Panel ─────────────────────────────────────────────────────────────
const SearchPanel = ({ files, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const results = query.trim()
    ? files.filter(f => f.type === 'file' && f.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="search-panel">
      <div className="panel-header-row">
        <Search size={14} />
        <span>Search Files</span>
      </div>
      <input
        className="futuristic-input search-input"
        placeholder="Search by filename..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      {query.trim() && (
        <div className="search-results">
          {results.length === 0 ? (
            <p className="text-muted" style={{ padding: '1rem', fontSize: '0.8rem', textAlign: 'center' }}>No files match "{query}"</p>
          ) : results.map(f => (
            <button key={f.id} className="search-result-item" onClick={() => onFileSelect(f)}>
              <span className="search-result-name">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel = () => {
  const {
    fontSize, setFontSize,
    wordWrap, setWordWrap,
    minimapEnabled, setMinimapEnabled,
    theme, setTheme,
    tabSize, setTabSize,
    lineNumbers, setLineNumbers,
    autoSave, setAutoSave,
  } = useSettingsStore();

  return (
    <div className="settings-panel">
      <div className="panel-header-row">
        <Settings size={14} />
        <span>Editor Settings</span>
      </div>

      <div className="setting-section">
        <label className="setting-label"><Type size={13} /> Font Size</label>
        <div className="setting-row">
          <input
            type="range" min="11" max="24" value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="setting-range"
          />
          <span className="setting-value">{fontSize}px</span>
        </div>
      </div>

      <div className="setting-section">
        <label className="setting-label"><Hash size={13} /> Tab Size</label>
        <div className="setting-row">
          {[2, 4].map(v => (
            <button key={v} className={`tab-size-btn ${tabSize === v ? 'active' : ''}`} onClick={() => setTabSize(v)}>{v}</button>
          ))}
        </div>
      </div>

      <div className="setting-section">
        <label className="setting-label"><AlignLeft size={13} /> Word Wrap</label>
        <button
          className={`toggle-btn ${wordWrap === 'on' ? 'active' : ''}`}
          onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
        >
          {wordWrap === 'on' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          <span>{wordWrap === 'on' ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="setting-section">
        <label className="setting-label"><Map size={13} /> Minimap</label>
        <button
          className={`toggle-btn ${minimapEnabled ? 'active' : ''}`}
          onClick={() => setMinimapEnabled(!minimapEnabled)}
        >
          {minimapEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          <span>{minimapEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="setting-section">
        <label className="setting-label"><Hash size={13} /> Line Numbers</label>
        <button
          className={`toggle-btn ${lineNumbers === 'on' ? 'active' : ''}`}
          onClick={() => setLineNumbers(lineNumbers === 'on' ? 'off' : 'on')}
        >
          {lineNumbers === 'on' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          <span>{lineNumbers === 'on' ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="setting-section">
        <label className="setting-label">💾 Auto Save</label>
        <button
          className={`toggle-btn ${autoSave ? 'active' : ''}`}
          onClick={() => setAutoSave(!autoSave)}
        >
          {autoSave ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          <span>{autoSave ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="setting-section">
        <label className="setting-label">🎨 Interface Theme</label>
        <div className="theme-grid">
          {[
            { id: 'midnight', color: '#38bdf8' },
            { id: 'cobalt', color: '#60a5fa' },
            { id: 'emerald', color: '#34d399' },
            { id: 'rose', color: '#fb7185' },
          ].map(t => (
            <button
              key={t.id}
              className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
              style={{ '--swatch-color': t.color }}
              onClick={() => setTheme(t.id)}
              title={t.id.charAt(0).toUpperCase() + t.id.slice(1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};



// ─── Collaboration Panel ──────────────────────────────────────────────────────
const CollabPanel = () => (
  <div className="collab-panel">
    <div className="panel-header-row"><Users size={14} /> <span>Collaboration</span></div>
    <div className="collab-status">
      <span className="status-dot online" />
      <span>Real-time sync active</span>
    </div>
    <p className="text-muted collab-hint">Share your session with others using the link below:</p>
    <div className="collab-link-row">
      <span className="collab-link-text">localhost:5173/?room=devorbit</span>
    </div>
  </div>
);

// ─── Sidebar Root ─────────────────────────────────────────────────────────────
const Sidebar = ({
  activePanel, setActivePanel,
  files, onFileCreate, onFileDelete, onFileRename, onFileSelect, currentFileId,
  onSyncProject
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const icons = [
    { id: 'explorer', icon: <Folder size={22} />,  label: 'Explorer',       shortcut: 'E' },
    { id: 'search',   icon: <Search size={22} />,  label: 'Search',         shortcut: 'F' },
    { id: 'collab',   icon: <Users size={22} />,   label: 'Collaboration',  shortcut: 'R' },
    { id: 'ai',       icon: <Code2 size={22} />,   label: 'AI Assistant',   shortcut: 'A' },
  ];

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-icons">
        <div className="top-icons">
          {icons.map((item) => (
            <div key={item.id} className="icon-btn-wrapper">
              <button
                className={`icon-btn ${activePanel === item.id && isOpen ? 'active' : ''}`}
                onClick={() => {
                  if (activePanel === item.id) setIsOpen(o => !o);
                  else { setActivePanel(item.id); setIsOpen(true); }
                }}
                title={item.label}
              >
                {item.icon}
              </button>
              <span className="icon-tooltip">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="bottom-icons">
          <div className="icon-btn-wrapper">
            <button
              className={`icon-btn ${activePanel === 'settings' && isOpen ? 'active' : ''}`}
              onClick={() => {
                if (activePanel === 'settings') setIsOpen(o => !o);
                else { setActivePanel('settings'); setIsOpen(true); }
              }}
              title="Settings"
            >
              <Settings size={22} />
            </button>
            <span className="icon-tooltip">Settings</span>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sidebar-panel animate-slide-left">
          <div className="panel-content" style={{ height: '100%' }}>
            {activePanel === 'explorer' && (
              <FileExplorer
                files={files}
                onFileCreate={onFileCreate}
                onFileDelete={onFileDelete}
                onFileRename={onFileRename}
                onFileSelect={onFileSelect}
                currentFileId={currentFileId}
                onSyncProject={onSyncProject}
              />
            )}
            {activePanel === 'search' && (
              <SearchPanel files={files} onFileSelect={onFileSelect} />
            )}
            {activePanel === 'collab' && <CollabPanel />}
            {activePanel === 'ai' && <ChatAssistant />}
            {activePanel === 'settings' && <SettingsPanel />}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
