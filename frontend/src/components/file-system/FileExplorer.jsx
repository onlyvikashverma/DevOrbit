import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FilePlus, FolderPlus, Trash2, Edit2, Check, X,
  MoreVertical, FileCode, FileJson, FileText, Coffee,
  RotateCcw, FolderSearch
} from 'lucide-react';
import OpenFolderModal from './OpenFolderModal';
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
    <div className="context-menu animate-fade-in" style={{ top: y, left: x }}>
      {node?.type === 'folder' && (
        <>
          <button className="ctx-item" onClick={() => { onNewFile(node.id); onClose(); }}>
            <FilePlus size={13} /> New File
          </button>
          <button className="ctx-item" onClick={() => { onNewFolder(node.id); onClose(); }}>
            <FolderPlus size={13} /> New Folder
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
    </div>
  );
};

// ─── Inline Input for creating file/folder ───────────────────────────────────
const InlineInput = ({ type, onConfirm, onCancel }) => {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <div className="inline-create-row">
      {type === 'folder' ? <Folder size={14} style={{ color: '#38bdf8', flexShrink: 0 }} /> : <File size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
      <input
        ref={inputRef}
        className="inline-input"
        value={val}
        placeholder={type === 'folder' ? 'folder-name' : 'file.js'}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && val.trim()) onConfirm(val.trim());
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button className="confirm-btn" onClick={() => val.trim() && onConfirm(val.trim())}><Check size={12} /></button>
      <button className="cancel-btn" onClick={onCancel}><X size={12} /></button>
    </div>
  );
};

// ─── Single File/Folder Node ─────────────────────────────────────────────────
const FileNode = ({
  node, level, allFiles, onSelect, activeId,
  onRename, onDelete, onCreateNode, onTriggerRename, renamingId,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editName, setEditName] = useState(node.name);
  const [inlineCreate, setInlineCreate] = useState(null); // { type: 'file'|'folder' }
  const [ctxMenu, setCtxMenu] = useState(null);
  const inputRef = useRef(null);

  const isFolder = node.type === 'folder';
  const nid = node.id || node._id?.toString();
  const isActive = nid === activeId;
  const isRenaming = renamingId === nid;
  const extCfg = getExtConfig(node.name);
  const children = allFiles.filter(f => {
    const pid = f.parentId || f.parent?.toString();
    return pid === nid;
  });

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

  return (
    <div className="file-node-container" style={{ paddingLeft: `${level * 14}px` }}>
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

      <div
        className={`file-node ${!isFolder ? 'file-item' : ''} ${isActive ? 'active-node' : ''}`}
        onClick={() => { if (isFolder) setIsOpen(o => !o); else onSelect(node); }}
        onContextMenu={handleContextMenu}
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
              <span className="file-ext-badge" style={{ background: extCfg.color + '22', color: extCfg.color, border: `1px solid ${extCfg.color}44` }}>
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
            <button className="confirm-btn" onClick={handleSaveRename}><Check size={12} /></button>
            <button className="cancel-btn" onClick={() => onTriggerRename(null)}><X size={12} /></button>
          </div>
        ) : (
          <span className="file-name" title={node.name}>{node.name}</span>
        )}

        {!isRenaming && (
          <div className="file-actions" onClick={e => e.stopPropagation()}>
            {isFolder && (
              <>
                <button className="action-btn" title="New File" onClick={() => setInlineCreate({ type: 'file', parentId: node.id })}>
                  <FilePlus size={11} />
                </button>
                <button className="action-btn" title="New Folder" onClick={() => setInlineCreate({ type: 'folder', parentId: node.id })}>
                  <FolderPlus size={11} />
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
      </div>

      {isFolder && isOpen && (
        <div className="folder-children">
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── FileExplorer Root ───────────────────────────────────────────────────────
const FileExplorer = ({
  files, onFileSelect, currentFileId, onFileCreate, onFileDelete, onFileRename,
  onSyncProject
}) => {
  const [renamingId, setRenamingId] = useState(null);
  const [inlineCreate, setInlineCreate] = useState(null); // root-level create
  const [isModalOpen, setIsModalOpen] = useState(false);

  const roots = files.filter(f => !f.parentId);
  const fileCount = files.filter(f => f.type === 'file').length;
  const folderCount = files.filter(f => f.type === 'folder').length;

  const handleRename = useCallback((id, newName) => {
    onFileRename(id, newName);
    setRenamingId(null);
  }, [onFileRename]);

  return (
    <div className="file-explorer column-layout">
      <div className="explorer-toolbar">
        <span className="toolbar-title">
          WORKSPACE
          {/* <span className="file-count-badge">{fileCount}F {folderCount > 0 ? `${folderCount}D` : ''}</span> */}
        </span>
        <div className="toolbar-actions">
          <button title="New File" onClick={() => setInlineCreate({ type: 'file' })}>
            <FilePlus size={15} />
          </button>
          <button title="New Folder" onClick={() => setInlineCreate({ type: 'folder' })}>
            <FolderPlus size={15} />
          </button>
        </div>
      </div>

      <div className="explorer-tree">
        {inlineCreate && (
          <InlineInput
            type={inlineCreate.type}
            onConfirm={name => { onFileCreate(name, inlineCreate.type, null); setInlineCreate(null); }}
            onCancel={() => setInlineCreate(null)}
          />
        )}

        {roots.length === 0 && !inlineCreate && (
          <div className="empty-explorer">
            <Folder size={32} style={{ opacity: 0.15, color: '#38bdf8', marginBottom: '0.5rem' }} />
            <p className="text-muted">No files yet</p>
            <button className="create-first-btn" onClick={() => setIsModalOpen(true)}>
              <FolderSearch size={13} /> Open Folder
            </button>
          </div>
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
          />
        ))}
      </div>

      {isModalOpen && (
        <OpenFolderModal
          onClose={() => setIsModalOpen(false)}
          onOpenPath={(path, clear) => onSyncProject(path, clear)}
        />
      )}
    </div>
  );
};


export default FileExplorer;
