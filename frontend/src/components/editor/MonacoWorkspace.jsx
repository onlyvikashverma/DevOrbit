import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { X, Code, Zap, FileCode, Coffee, Globe, Terminal, Cpu } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import './MonacoWorkspace.css';

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

// ─── Welcome Screen ───────────────────────────────────────────────────────────
const WelcomeScreen = ({ onQuickAction }) => (
  <div className="welcome-screen glass-panel-inner">
    <div className="welcome-logo animate-float">
      <Zap size={40} strokeWidth={1.5} />
    </div>
    <h2 className="welcome-title text-gradient">DevOrbit IDE</h2>
    <p className="welcome-sub text-secondary">Select a file or start with a quick action</p>
    <div className="welcome-actions">
      {QUICK_ACTIONS.map(qa => (
        <button key={qa.action} className="quick-action-btn" onClick={() => onQuickAction?.(qa.action)}>
          <span className="quick-action-icon">{qa.icon}</span>
          <span>{qa.label}</span>
        </button>
      ))}
    </div>
    <div className="welcome-shortcuts">
      <div className="shortcut-item"><kbd>Ctrl+Enter</kbd> Run Code</div>
      <div className="shortcut-item"><kbd>Ctrl+S</kbd> Save</div>
      <div className="shortcut-item"><kbd>Ctrl+`</kbd> Terminal</div>
    </div>
  </div>
);

// ─── MonacoWorkspace ──────────────────────────────────────────────────────────
const MonacoWorkspace = ({
  currentFile, openFiles, onCodeChange, onTabSelect, onTabClose, onLanguageChange, onQuickAction
}) => {
  const editorRef = useRef(null);
  const { fontSize, wordWrap, minimapEnabled, tabSize, lineNumbers } = useSettingsStore();
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [modifiedIds, setModifiedIds] = useState(new Set());

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
    monaco.editor.setTheme('devorbit-dark');

    editor.onDidChangeCursorPosition(e => {
      setCursor({ line: e.position.lineNumber, col: e.position.column });
    });
  };

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
    return <WelcomeScreen onQuickAction={onQuickAction} />;
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
