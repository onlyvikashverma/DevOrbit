import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { X, Code, Zap, FileCode, Coffee, Globe, Terminal, Cpu } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { socket } from '../../services/socket';
import ProjectDashboard from '../dashboard/ProjectDashboard';
import './MonacoWorkspace.css';
import './Collaboration.css';

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: 'js',   icon: '⚡', color: '#fbbf24' },
  { id: 'python',     label: 'Python',     ext: 'py',   icon: '🐍', color: '#4ade80' },
  { id: 'java',       label: 'Java',       ext: 'java', icon: '☕', color: '#fb923c' },
  { id: 'cpp',        label: 'C++',        ext: 'cpp',  icon: '⚙️', color: '#c084fc' },
  { id: 'c',          label: 'C',          ext: 'c',    icon: '⚙️', color: '#a78bfa' },
];

const QUICK_ACTIONS = [
  { icon: <FileCode size={20} />, label: 'New JS File',     action: 'new-js'   },
  { icon: <Cpu size={20} />,      label: 'New Python File', action: 'new-py'   },
  { icon: <Coffee size={20} />,   label: 'New Java File',   action: 'new-java' },
  { icon: <Terminal size={20} />, label: 'New C++ File',    action: 'new-cpp'  },
];

// ─── Welcome Wrapper ────────────────────────────────────────────────────────
// (Old WelcomeScreen removed in favor of ProjectDashboard)

// ─── MonacoWorkspace ──────────────────────────────────────────────────────────
const MonacoWorkspace = ({
  currentFile, openFiles, onCodeChange, onTabSelect, onTabClose, onLanguageChange, onQuickAction,
  activities, files
}) => {
  const editorRef = useRef(null);
  const { fontSize, wordWrap, minimapEnabled, tabSize, lineNumbers } = useSettingsStore();
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [modifiedIds, setModifiedIds] = useState(new Set());
  const remoteCursorsRef = useRef({}); // { socketId: [decorationIds] }
  const monacoRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('devorbit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { background: '0a0e1a' },
        { token: 'comment',   foreground: '475569', fontStyle: 'italic' },
        { token: 'keyword',   foreground: 'c084fc', fontStyle: 'bold' },
        { token: 'string',    foreground: '4ade80' },
        { token: 'number',    foreground: 'fb923c' },
        { token: 'function',  foreground: '38bdf8' },
        { token: 'type',      foreground: 'f472b6' },
        { token: 'variable',  foreground: 'f1f5f9' },
        { token: 'operator',  foreground: '94a3b8' },
      ],
      colors: {
        'editor.background':                 '#0a0e1a00',
        'editor.foreground':                 '#f1f5f9',
        'editor.lineHighlightBackground':    '#ffffff08',
        'editorLineNumber.foreground':       '#334155',
        'editorLineNumber.activeForeground': '#64748b',
        'editorIndentGuide.background':      '#1e293b',
        'editorCursor.foreground':           '#38bdf8',
        'editor.selectionBackground':        '#38bdf820',
        'editor.selectionHighlightBorder':   '#38bdf840',
        'editorBracketMatch.background':     '#c084fc20',
        'editorBracketMatch.border':         '#c084fc60',
        'scrollbar.shadow':                  '#00000000',
        'scrollbarSlider.background':        '#ffffff10',
        'scrollbarSlider.hoverBackground':   '#ffffff20',
      }
    });
    monacoRef.current = monaco;
    monaco.editor.setTheme('devorbit-dark');

    editor.onDidChangeCursorPosition(e => {
      const pos = { line: e.position.lineNumber, col: e.position.column };
      setCursor(pos);

      // Emit cursor move to backend
      if (currentFile?.id) {
        socket.emit('cursor-move', {
          fileId: currentFile.id,
          cursor: pos
        });
      }
    });
  };

  // ─── Remote Cursors Logic ──────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !currentFile) return;

    const onRemoteCursor = (data) => {
      // Only show if on the same file and not ourselves
      if (data.fileId !== currentFile.id || data.id === socket.id) {
        // If they were on this file but moved away, clear their decoration
        if (remoteCursorsRef.current[data.id]) {
          editorRef.current.deltaDecorations(remoteCursorsRef.current[data.id], []);
          delete remoteCursorsRef.current[data.id];
        }
        return;
      }

      const { id, userName, userColor, cursor: remotePos } = data;

      // Create new decoration
      const newDecorations = [
        // The Cursor Line
        {
          range: new monacoRef.current.Range(remotePos.line, remotePos.col, remotePos.line, remotePos.col + 1),
          options: {
            className: 'remote-cursor',
            beforeContentClassName: `remote-cursor-label-${id}`, // We'll inject dynamic CSS for color
          }
        }
      ];

      // Inject dynamic CSS for this user's color if needed
      let styleTag = document.getElementById(`cursor-style-${id}`);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = `cursor-style-${id}`;
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
        .remote-cursor-label-${id}::after { 
          content: "${userName}";
          background-color: ${userColor};
          position: absolute;
          top: -20px;
          left: 0;
          padding: 2px 6px;
          color: white;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          border-radius: 4px;
          opacity: 0.9;
          pointer-events: none;
        }
        .remote-cursor { border-left: 2px solid ${userColor}; shadow: 0 0 5px ${userColor}; }
      `;

      // Apply decoration
      const oldDecorations = remoteCursorsRef.current[id] || [];
      remoteCursorsRef.current[id] = editorRef.current.deltaDecorations(oldDecorations, newDecorations);
    };

    socket.on('remote-cursor-move', onRemoteCursor);

    // Cleanup on unmount or file change
    return () => {
      socket.off('remote-cursor-move', onRemoteCursor);
      // Clear all remote cursors when switching files
      Object.keys(remoteCursorsRef.current).forEach(id => {
        if (editorRef.current) {
          editorRef.current.deltaDecorations(remoteCursorsRef.current[id], []);
        }
        const styleTag = document.getElementById(`cursor-style-${id}`);
        if (styleTag) styleTag.remove();
      });
      remoteCursorsRef.current = {};
    };
  }, [currentFile?.id]);

  const handleCodeChange = (value) => {
    if (!currentFile) return;
    setModifiedIds(prev => new Set(prev).add(currentFile.id));
    onCodeChange(currentFile.id, value);
  };

  const handleTabClose = (id, e) => {
    e.stopPropagation();
    setModifiedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    onTabClose(id);
  };

  const currentExt = currentFile?.name.split('.').pop()?.toLowerCase();
  const detectedLang = SUPPORTED_LANGUAGES.find(l => l.ext === currentExt) || SUPPORTED_LANGUAGES[0];

  if (!currentFile) {
    return <ProjectDashboard files={files} activities={activities} onQuickAction={onQuickAction} />;
  }

  return (
    <div className="monaco-workspace">
      {/* Tab Bar */}
      <div className="editor-top-bar">
        <div className="editor-tabs">
          {openFiles.map(file => {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const langConf = SUPPORTED_LANGUAGES.find(l => l.ext === ext);
            const isActive = currentFile.id === file.id;
            const isModified = modifiedIds.has(file.id);
            return (
              <div
                key={file.id}
                className={`editor-tab ${isActive ? 'active' : ''}`}
                onClick={() => onTabSelect(file.id)}
              >
                {langConf && (
                  <span className="tab-lang-dot" style={{ background: langConf.color }} />
                )}
                <span className="tab-filename">{file.name}</span>
                {isModified && <span className="tab-modified-dot" title="Unsaved changes" />}
                <span className="close-tab-icon" onClick={e => handleTabClose(file.id, e)}>
                  <X size={11} />
                </span>
              </div>
            );
          })}
        </div>

        <div className="editor-toolbar-right">
          <select
            className="futuristic-select lang-select"
            value={detectedLang.id}
            onChange={e => {
              const sel = SUPPORTED_LANGUAGES.find(l => l.id === e.target.value);
              if (sel) onLanguageChange(currentFile.id, sel.ext);
            }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.icon} {lang.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-container glass-panel-inner">
        <Editor
          height="100%"
          language={detectedLang.id}
          theme="devorbit-dark"
          value={currentFile.content}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            minimap:                   { enabled: minimapEnabled },
            fontSize:                  fontSize,
            fontFamily:                'JetBrains Mono, Fira Code, monospace',
            fontLigatures:             true,
            wordWrap:                  wordWrap,
            tabSize:                   tabSize,
            lineNumbers:               lineNumbers,
            smoothScrolling:           true,
            cursorBlinking:            'smooth',
            cursorSmoothCaretAnimation:'on',
            formatOnPaste:             true,
            formatOnType:              true,
            padding:                   { top: 16, bottom: 16 },
            bracketPairColorization:   { enabled: true },
            guides: {
              bracketPairs:            true,
              indentation:             true,
            },
            renderWhitespace:          'selection',
            scrollBeyondLastLine:      false,
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="editor-status-bar">
        <div className="status-left">
          <span className="status-item status-lang" style={{ color: detectedLang.color }}>
            <span>{detectedLang.icon}</span>
            <span>{detectedLang.label}</span>
          </span>
          <span className="status-divider" />
          <span className="status-item">Ln {cursor.line}, Col {cursor.col}</span>
          <span className="status-divider" />
          <span className="status-item">Spaces: {tabSize}</span>
        </div>
        <div className="status-right">
          <span className="status-item">UTF-8</span>
          <span className="status-divider" />
          <span className="status-item">
            {modifiedIds.has(currentFile?.id) ? (
              <span style={{ color: '#fbbf24' }}>● Unsaved</span>
            ) : (
              <span style={{ color: '#4ade80' }}>✓ Saved</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonacoWorkspace;
