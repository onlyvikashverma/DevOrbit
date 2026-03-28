import React, { useState } from 'react';
import { X, FolderOpen, Info, AlertCircle, Monitor, LayoutGrid, Search } from 'lucide-react';
import SystemBrowser from './SystemBrowser';
import './OpenFolderModal.css';

const OpenFolderModal = ({ onClose, onOpenPath }) => {
  const [path, setPath] = useState('');
  const [clearExisting, setClearExisting] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('browser'); // 'input' or 'browser'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!path.trim()) {
      setError('Please enter a valid directory path');
      return;
    }
    onOpenPath(path.trim(), clearExisting);
    onClose();
  };

  const handleBrowserSelect = (selectedPath) => {
    setPath(selectedPath);
    setMode('input'); // Switch back to see the path if needed, or just submit
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content open-folder-modal animate-scale-up ${mode === 'browser' ? 'wide-modal' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="modal-header">
          <div className="modal-icon-wrapper">
            <Monitor size={24} className="text-gradient-icon" />
          </div>
          <div className="modal-title-group">
            <h2 className="modal-heading">Access System Files</h2>
            <p className="modal-sub text-muted">Browse your laptop folders to start coding</p>
          </div>
        </div>

        <div className="mode-toggle-bar">
          <button
            className={`mode-btn ${mode === 'browser' ? 'active' : ''}`}
            onClick={() => setMode('browser')}
          >
            <LayoutGrid size={14} /> Visual Browser
          </button>
          <button
            className={`mode-btn ${mode === 'input' ? 'active' : ''}`}
            onClick={() => setMode('input')}
          >
            <Search size={14} /> Manual Path
          </button>
        </div>

        {mode === 'browser' ? (
          <div className="browser-mode-container">
            <SystemBrowser onSelectPath={handleBrowserSelect} />

            <div className="browser-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="checkbox-label">Clear workspace on open</span>
              </label>
            </div>

            {path && (
              <div className="selection-confirm-box animate-fade-in">
                <div className="selection-text">
                  <span className="label">Ready to open:</span>
                  <span className="val">{path}</span>
                </div>
                <button
                  className="btn-primary-gradient"
                  onClick={() => onOpenPath(path, clearExisting)}
                >
                  Confirm & Open
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="input-group">
              <label className="input-label">Absolute Directory Path</label>
              <div className="path-input-wrapper">
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Name\Projects\MyCode"
                  className={`futuristic-input ${error ? 'input-error' : ''}`}
                  value={path}
                  onChange={(e) => { setPath(e.target.value); setError(''); }}
                  autoFocus
                />
                {error && <div className="error-hint"><AlertCircle size={12} /> {error}</div>}
              </div>
              <p className="input-help"><Info size={12} /> Paste the full path from your file explorer.</p>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="checkbox-label">Clear current workspace before sync</span>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary-gradient">
                <FolderOpen size={16} /> Open Folder
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


export default OpenFolderModal;
