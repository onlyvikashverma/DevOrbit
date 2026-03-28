import React, { useState, useEffect } from 'react';
import { 
  Folder, File, ChevronRight, Home, HardDrive, 
  ArrowLeft, Search, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import './SystemBrowser.css';

const SystemBrowser = ({ onSelectPath, initialPath = '' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentPath, setParentPath] = useState(null);

  const fetchContents = async (path = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5050/api/files/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: path })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch directory');
      
      setContents(data.contents || []);
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents(initialPath);
  }, []);

  const handleNavigate = (path) => {
    fetchContents(path);
  };

  const filteredContents = contents.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbs = currentPath === 'drives' 
    ? ['Drives'] 
    : currentPath.split(/[\\/]/).filter(Boolean);

  return (
    <div className="system-browser container-glass">
      {/* Header / Navigation Controls */}
      <div className="browser-header">
        <div className="nav-controls">
          <button 
            className="nav-btn" 
            onClick={() => parentPath !== undefined && handleNavigate(parentPath)}
            disabled={!parentPath || currentPath === 'drives'}
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <button 
            className="nav-btn" 
            onClick={() => handleNavigate('')}
            title="Home / Drives"
          >
            {process.platform === 'win32' ? <HardDrive size={16} /> : <Home size={16} />}
          </button>
        </div>

        <div className="breadcrumb-bar">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <span className="breadcrumb-item">{crumb}</span>
              {i < breadcrumbs.length - 1 && <ChevronRight size={12} className="breadcrumb-sep" />}
            </React.Fragment>
          ))}
        </div>

        <div className="search-bar">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search folders..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Directory Contents */}
      <div className="browser-content custom-scrollbar">
        {loading ? (
          <div className="browser-status">
            <Loader2 size={32} className="animate-spin text-accent-blue" />
            <p>Scanning Directory...</p>
          </div>
        ) : error ? (
          <div className="browser-status text-danger">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="retry-btn" onClick={() => fetchContents(currentPath)}>Retry</button>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="browser-status text-muted">
            <Search size={32} />
            <p>No folders or files found here</p>
          </div>
        ) : (
          <div className="items-grid">
            {filteredContents.map((item, index) => (
              <div 
                key={index} 
                className={`browser-item ${item.type}`}
                onClick={() => item.type !== 'file' && handleNavigate(item.path)}
                onDoubleClick={() => item.type !== 'file' && onSelectPath(item.path)}
              >
                <div className="item-icon">
                  {item.type === 'drive' ? <HardDrive size={24} /> : 
                   item.type === 'folder' ? <Folder size={24} /> : 
                   <File size={24} />}
                </div>
                <div className="item-info">
                  <span className="item-name" title={item.name}>{item.name}</span>
                  <span className="item-type">{item.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Selection */}
      <div className="browser-footer">
        <div className="selected-path-info">
          <span className="label">Current Target:</span>
          <span className="path-text">{currentPath === 'drives' ? 'System Drives' : currentPath}</span>
        </div>
        <button 
          className="select-path-btn btn-primary"
          disabled={currentPath === 'drives' || loading}
          onClick={() => onSelectPath(currentPath)}
        >
          <CheckCircle2 size={16} />
          Select This Folder
        </button>
      </div>
    </div>
  );
};

export default SystemBrowser;
