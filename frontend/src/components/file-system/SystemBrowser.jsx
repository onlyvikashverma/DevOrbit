import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, File, ChevronRight, Home, HardDrive, 
  ArrowLeft, Search, CheckCircle2, AlertCircle, Loader2,
  LayoutGrid, List, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './SystemBrowser.css';

const SystemBrowser = ({ onSelectPath, initialPath = '' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [editPathVal, setEditPathVal] = useState('');

  const fetchContents = async (path = '') => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
      const response = await fetch(`${BACKEND_URL}/api/files/browse`, {
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
    setIsEditingPath(false);
  };

  const handlePathEditSubmit = (e) => {
    if (e.key === 'Enter') handleNavigate(editPathVal);
    if (e.key === 'Escape') setIsEditingPath(false);
  };

  const filteredContents = useMemo(() => 
    contents.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [contents, searchQuery]
  );

  const breadcrumbs = useMemo(() => {
    if (currentPath === 'drives') return [{ label: 'Drives', path: '' }];
    
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    const crumbs = [{ label: process.platform === 'win32' ? 'This PC' : 'Home', path: '' }];
    
    let accPath = '';
    parts.forEach((part, i) => {
      // Handle Windows drive roots (e.g., C:)
      if (i === 0 && part.endsWith(':')) {
        accPath = part + '\\';
      } else {
        accPath += (accPath.endsWith('\\') || accPath.endsWith('/') ? '' : '/') + part;
      }
      crumbs.push({ label: part, path: accPath });
    });
    
    return crumbs;
  }, [currentPath]);

  const COMMON_LOCATIONS = [
    { label: 'This PC', icon: <HardDrive size={16} />, path: '' },
    { label: 'Desktop', icon: <Monitor size={16} />, path: 'Desktop' }, // Backend handles resolving to user home
    { label: 'Documents', icon: <FileText size={16} />, path: 'Documents' },
    { label: 'Downloads', icon: <RefreshCw size={16} />, path: 'Downloads' }
  ];

  return (
    <div className="system-browser glass-panel-modal">
      {/* Side Navigation for Common Places */}
      <div className="browser-sidebar">
        <div className="sidebar-group">
          <span className="sidebar-title">NAVIGATE</span>
          {COMMON_LOCATIONS.map(loc => (
            <button 
              key={loc.label} 
              className={`sidebar-item ${currentPath === loc.path || (loc.path === '' && currentPath === 'drives') ? 'active' : ''}`}
              onClick={() => handleNavigate(loc.path)}
            >
              {loc.icon}
              <span>{loc.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="browser-main">
        {/* Header / Navigation Controls */}
      <div className="browser-header">
        <div className="nav-controls">
          <button 
            className="nav-btn" 
            onClick={() => parentPath !== undefined && handleNavigate(parentPath)}
            disabled={!parentPath || currentPath === 'drives' || loading}
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <button 
            className="nav-btn" 
            onClick={() => handleNavigate('')}
            disabled={loading}
            title="Home / Drives"
          >
            {process.platform === 'win32' ? <HardDrive size={16} /> : <Home size={16} />}
          </button>
          <button 
            className="nav-btn" 
            onClick={() => fetchContents(currentPath)}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="breadcrumb-area">
          {isEditingPath ? (
            <input 
              className="path-edit-input"
              value={editPathVal}
              onChange={e => setEditPathVal(e.target.value)}
              onKeyDown={handlePathEditSubmit}
              onBlur={() => setIsEditingPath(false)}
              autoFocus
            />
          ) : (
            <div className="breadcrumb-bar" onClick={() => { setIsEditingPath(true); setEditPathVal(currentPath); }}>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  <button 
                    className="breadcrumb-item-btn"
                    onClick={(e) => { e.stopPropagation(); handleNavigate(crumb.path); }}
                    disabled={loading}
                  >
                    {crumb.label}
                  </button>
                  {i < breadcrumbs.length - 1 && <ChevronRight size={10} className="breadcrumb-sep" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="browser-actions">
           <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>

          <div className="search-bar-browser">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Directory Contents */}
      <div className="browser-content custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="browser-status"
            >
              <div className="scanner-animation">
                <div className="scan-line"></div>
                <Loader2 size={40} className="animate-spin text-accent-blue" />
              </div>
              <p className="loading-text">Scanning System Layers...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="browser-status text-danger"
            >
              <AlertCircle size={40} />
              <p>{error}</p>
              <button className="retry-btn-neon" onClick={() => fetchContents(currentPath)}>Initialize Retry</button>
            </motion.div>
          ) : filteredContents.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="browser-status text-muted"
            >
              <Search size={40} style={{ opacity: 0.2 }} />
              <p>No compatible neural nodes found</p>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`items-container ${viewMode}-view`}
            >
              {filteredContents.map((item, index) => (
                <motion.div 
                  key={item.path + index}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`browser-item card-glass ${item.type}`}
                  onClick={() => {
                    if (item.type !== 'file') handleNavigate(item.path);
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="item-icon-container">
                    {item.type === 'drive' ? <HardDrive size={viewMode === 'grid' ? 28 : 18} /> : 
                     item.type === 'folder' ? <Folder size={viewMode === 'grid' ? 28 : 18} /> : 
                     <File size={viewMode === 'grid' ? 28 : 18} />}
                  </div>
                  <div className="item-info">
                    <span className="item-name" title={item.name}>{item.name}</span>
                    <span className="item-type-badge">{item.type}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Selection */}
      <div className="browser-footer glass-panel">
        <div className="selected-path-display">
          <span className="label-access">ACCESS PATH</span>
          <div className="path-glow-box">
             <span className="path-text-neon">{currentPath === 'drives' ? 'SYSTEM://DRIVES' : currentPath}</span>
          </div>
        </div>
        <button 
          className="select-path-btn-futuristic"
          disabled={currentPath === 'drives' || loading}
          onClick={() => onSelectPath(currentPath)}
        >
          <div className="btn-content">
            <CheckCircle2 size={18} />
            <span>MOUNT DIRECTORY</span>
          </div>
          <div className="btn-glow"></div>
        </button>
      </div>
      </div>
    </div>
  );
};

export default SystemBrowser;
