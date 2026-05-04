import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FilePlus, FolderPlus, Trash2, Edit2, Check, X,
  MoreVertical, FileCode, FileJson, FileText, Coffee,
  RotateCcw, FolderSearch, Search, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './FileExplorer.css';

// ─── Extension → Color & Icon mapping ───────────────────────────────────────
const EXT_CONFIG = {
  js: { color: '#fbbf24', label: 'JS' },
  jsx: { color: '#61dafb', label: 'JSX' },
  ts: { color: '#3b82f6', label: 'TS' },
  tsx: { color: '#3b82f6', label: 'TSX' },
  py: { color: '#4ade80', label: 'PY' },
  java: { color: '#fb923c', label: 'JV' },
  cpp: { color: '#c084fc', label: 'C++' },
  c: { color: '#a78bfa', label: 'C' },
  html: { color: '#f87171', label: 'HT' },
  css: { color: '#38bdf8', label: 'CS' },
  json: { color: '#fde68a', label: '{}' },
  md: { color: '#94a3b8', label: 'MD' },
  sh: { color: '#4ade80', label: 'SH' },
  rs: { color: '#fb923c', label: 'RS' },
  go: { color: '#67e8f9', label: 'GO' },
  php: { color: '#777bb4', label: 'PHP' },
  rb: { color: '#e33332', label: 'RB' },
  swift: { color: '#f05138', label: 'SW' },
};

function getExtConfig(name) {
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  return EXT_CONFIG[ext] || { color: '#94a3b8', label: ext.toUpperCase().slice(0, 2) || '?' };
}

// ─── Context Menu ────────────────────────────────────────────────────────────
const ContextMenu = ({ x, y, node, onRename, onDelete, onNewFile, onNewFolder, onClose }) => {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close, { once: true });
    return () => window.removeEventListener('click', close);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="context-menu glass-panel" 
      style={{ top: y, left: x }}
    >
      {node?.type === 'folder' && (
        <>
          <button className="ctx-item" onClick={() => { onNewFile(node.id); onClose(); }}>
            <FilePlus size={13} /> New File
          </button>
          <div className="ctx-divider" />
        </>
      )}
      <button className="ctx-item" onClick={() => { onRename(node.id); onClose(); }}>
        <Edit2 size={13} /> Rename
      </button>
      <button className="ctx-item ctx-item-danger" onClick={() => { onDelete(node.id); onClose(); }}>
        <Trash2 size={13} /> Delete
      </button>
    </motion.div>
  );
};

// ─── Inline Input for creating file/folder ───────────────────────────────────
const InlineInput = ({ type, onConfirm, onCancel }) => {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="inline-create-row"
    >
      {type === 'folder' ? <Folder size={14} style={{ color: '#38bdf8', flexShrink: 0 }} /> : <File size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
      <input
        ref={inputRef}
        className="inline-input"
        value={val}
        autoFocus
        placeholder={type === 'folder' ? 'folder-name' : 'file.js'}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && val.trim()) onConfirm(val.trim());
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="inline-actions">
        <button className="confirm-btn" onClick={() => val.trim() && onConfirm(val.trim())}><Check size={12} /></button>
        <button className="cancel-btn" onClick={onCancel}><X size={12} /></button>
      </div>
    </motion.div>
  );
};

// ─── Single File/Folder Node ─────────────────────────────────────────────────
const FileNode = ({
  node, level, allFiles, onSelect, activeId,
  onRename, onDelete, onCreateNode, onTriggerRename, renamingId,
  searchQuery
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editName, setEditName] = useState(node.name);
  const [inlineCreate, setInlineCreate] = useState(null); 
  const [ctxMenu, setCtxMenu] = useState(null);
  const inputRef = useRef(null);

  const isFolder = node.type === 'folder';
  const nid = node.id || node._id?.toString();
  const isActive = nid === activeId;
  const isRenaming = renamingId === nid;
  const extCfg = getExtConfig(node.name);
  
  const children = useMemo(() => 
    allFiles.filter(f => (f.parentId || f.parent?.toString()) === nid),
    [allFiles, nid]
  );

  // If search matches a child, ensure folder is open
  useEffect(() => {
    if (searchQuery && children.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
      setIsOpen(true);
    }
  }, [searchQuery, children]);

  useEffect(() => {
    if (isRenaming) { setEditName(node.name); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [isRenaming]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const handleSaveRename = () => {
    if (editName.trim()) onRename(node.id, editName.trim());
  };

  // Hide if searching and neither this node nor any descendant matches
  const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());
  const descendantMatches = useMemo(() => {
    if (!searchQuery) return true;
    const findMatch = (nodes) => {
      for (const n of nodes) {
        if (n.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        const subChildren = allFiles.filter(f => (f.parentId || f.parent?.toString()) === n.id);
        if (findMatch(subChildren)) return true;
      }
      return false;
    };
    return findMatch(children);
  }, [searchQuery, children, allFiles]);

  if (searchQuery && !matchesSearch && !descendantMatches) return null;

  return (
    <div className="file-node-container" style={{ paddingLeft: `${level * 12}px` }}>
      <AnimatePresence>
        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x} y={ctxMenu.y} node={node}
            onRename={onTriggerRename}
            onDelete={() => onDelete(node.id)}
            onNewFile={(pid) => setInlineCreate({ type: 'file', parentId: pid })}
            onNewFolder={(pid) => setInlineCreate({ type: 'folder', parentId: pid })}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className={`file-node ${!isFolder ? 'file-item' : ''} ${isActive ? 'active-node' : ''}`}
        onClick={() => { if (isFolder) setIsOpen(o => !o); else onSelect(node); }}
        onContextMenu={handleContextMenu}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <span className="file-icon-group">
          {isFolder ? (
            <>
              <span className="chevron-icon">{isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
              {isOpen ? <FolderOpen size={14} className="folder-icon" /> : <Folder size={14} className="folder-icon" />}
            </>
          ) : (
            <>
              <span style={{ width: 13, display: 'inline-block' }} />
              <span className="file-ext-badge" style={{ background: extCfg.color + '15', color: extCfg.color, border: `1px solid ${extCfg.color}33` }}>
                {extCfg.label}
              </span>
            </>
          )}
        </span>

        {isRenaming ? (
          <div className="rename-container" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="rename-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') onTriggerRename(null); }}
            />
            <div className="rename-actions">
              <button className="confirm-btn" onClick={handleSaveRename}><Check size={12} /></button>
              <button className="cancel-btn" onClick={() => onTriggerRename(null)}><X size={12} /></button>
            </div>
          </div>
        ) : (
          <span className="file-name" title={node.name}>
            {searchQuery ? (
               node.name.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                part.toLowerCase() === searchQuery.toLowerCase() 
                  ? <span key={i} className="search-highlight">{part}</span> 
                  : part
              )
            ) : node.name}
          </span>
        )}

        {!isRenaming && (
          <div className="file-actions" onClick={e => e.stopPropagation()}>
            {isFolder && (
              <>
                <button className="action-btn" title="New File" onClick={() => setInlineCreate({ type: 'file', parentId: node.id })}>
                  <FilePlus size={11} />
                </button>
              </>
            )}
            <button className="action-btn rename-btn" title="Rename" onClick={() => onTriggerRename(node.id)}>
              <Edit2 size={11} />
            </button>
            <button className="action-btn delete-btn" title="Delete" onClick={() => onDelete(node.id)}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isFolder && isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="folder-children"
          >
            {inlineCreate && (
              <div style={{ paddingLeft: '14px' }}>
                <InlineInput
                  type={inlineCreate.type}
                  onConfirm={name => { onCreateNode(name, inlineCreate.type, node.id); setInlineCreate(null); }}
                  onCancel={() => setInlineCreate(null)}
                />
              </div>
            )}
            {children.map(child => (
              <FileNode
                key={child.id}
                node={child}
                level={level + 1}
                allFiles={allFiles}
                onSelect={onSelect}
                activeId={activeId}
                onRename={onRename}
                onDelete={onDelete}
                onCreateNode={onCreateNode}
                onTriggerRename={onTriggerRename}
                renamingId={renamingId}
                searchQuery={searchQuery}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── FileExplorer Root ───────────────────────────────────────────────────────
const FileExplorer = ({
  files, onFileSelect, currentFileId, onFileCreate, onFileDelete, onFileRename,
}) => {
  const [renamingId, setRenamingId] = useState(null);
  const [inlineCreate, setInlineCreate] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');

  const roots = useMemo(() => files.filter(f => !f.parentId), [files]);
  
  const handleRename = useCallback((id, newName) => {
    onFileRename(id, newName);
    setRenamingId(null);
  }, [onFileRename]);

  return (
    <div className="file-explorer column-layout">
      <div className="explorer-header">
        <div className="explorer-toolbar">
          <span className="toolbar-title">
            WORKSPACE
          </span>
          <div className="toolbar-actions">
              <>
                <button title="New File" onClick={() => setInlineCreate({ type: 'file' })}>
                  <FilePlus size={18} strokeWidth={2} />
                </button>
              </>
          </div>
        </div>

        <div className="search-container">
          <div className="search-box glass-panel">
            <Search size={12} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="explorer-tree custom-scrollbar">
        <AnimatePresence>
          {inlineCreate && (
            <InlineInput
              type={inlineCreate.type}
              onConfirm={name => { onFileCreate(name, inlineCreate.type, null); setInlineCreate(null); }}
              onCancel={() => setInlineCreate(null)}
            />
          )}
        </AnimatePresence>

        {roots.length === 0 && !inlineCreate && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-explorer"
          >
            <div className="empty-glow-circle">
              <FolderSearch size={24} />
            </div>
            <p className="empty-text">No workspace loaded</p>
            <p className="empty-sub">Create a new file to start development</p>
          </motion.div>
        )}

        {roots.map(node => (
          <FileNode
            key={node.id}
            node={node}
            level={0}
            allFiles={files}
            onSelect={onFileSelect}
            activeId={currentFileId}
            onRename={handleRename}
            onDelete={onFileDelete}
            onCreateNode={onFileCreate}
            onTriggerRename={setRenamingId}
            renamingId={renamingId}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
