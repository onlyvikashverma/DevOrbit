import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/layout/Sidebar';
import BottomConsole from './components/layout/BottomConsole';
import MonacoWorkspace from './components/editor/MonacoWorkspace';
import AiAssistant from './components/ai/AiAssistant';
import CommandPalette from './components/layout/CommandPalette';
import AuthModal from './components/auth/AuthModal';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useToast } from './components/ui/Toast';
import { socket, connectSocket, disconnectSocket } from './services/socket';
import { Play, LogIn, LogOut, Wifi, WifiOff, Zap, Sparkles, Palette } from 'lucide-react';
import './App.css';

const BOILERPLATES = {
  js:   '// JavaScript Environment\nconsole.log("Hello, DevOrbit!");\n',
  py:   '# Python 3 Environment\nprint("Hello, DevOrbit!")\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, DevOrbit!");\n    }\n}\n',
  cpp:  '#include <iostream>\n\nint main() {\n    std::cout << "Hello, DevOrbit!" << std::endl;\n    return 0;\n}\n',
  c:    '#include <stdio.h>\n\nint main() {\n    printf("Hello, DevOrbit!\\n");\n    return 0;\n}\n',
  ts:   '// TypeScript Environment\nconst greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet("DevOrbit"));\n',
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>DevOrbit</title>\n</head>\n<body>\n  <h1>Hello, DevOrbit!</h1>\n</body>\n</html>\n',
  rb:   '# Ruby Environment\nputs "Hello, DevOrbit!"\n',
  go:   '// Go Environment\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, DevOrbit!")\n}\n',
  rs:   '// Rust Environment\nfn main() {\n    println!("Hello, DevOrbit!");\n}\n',
  php:  '<?php\n// PHP Environment\necho "Hello, DevOrbit!";\n?>\n',
  sh:   '#!/bin/bash\n# Bash Environment\necho "Hello, DevOrbit!"\n',
  swift:'// Swift Environment\nprint("Hello, DevOrbit!")\n',
};

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
const API_URL = `${BACKEND_URL}/api/files`;

function App() {
  const sessionId = useMemo(() => {
    let sid = sessionStorage.getItem('devorbit_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('devorbit_session_id', sid);
    }
    return sid;
  }, []);
  const [activePanel, setActivePanel] = useState('explorer');
  const [files, setFiles] = useState([]);
  const [openFileIds, setOpenFileIds] = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState('');
  const [lastExecTime, setLastExecTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState('');
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activities, setActivities] = useState([
    { id: 'initial', type: 'info', message: 'DevOrbit Workspace initialized.', timestamp: new Date() }
  ]);
  const [showPalette, setShowPalette] = useState(false);

  const { user, token, logout } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const toast = useToast();

  const currentFile = files.find(f => f.id === currentFileId) || null;
  const openFilesList = openFileIds.map(id => files.find(f => f.id === id)).filter(Boolean);

  // ─── Theme Application ────────────────────────────────────────────────────
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  // ─── Live Clock ───────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Fetch files ──────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      const userId = user?.id || '';
      const res = await fetch(`${API_URL}?sessionId=${sessionId}&userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        console.error('Expected array from files API, got:', data);
        setFiles([]);
      }
    } catch (e) {
      console.error('Failed to load files', e);
      setFiles([]);
    }
  }, [user, sessionId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // ─── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    // Pass user info and sessionId during handshake for presence
    const query = { sessionId, ...(user ? { userId: user.id, userName: user.name } : {}) };
    connectSocket(token, query);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('presence-update', (users) => {
      // Filter out users who are not logged in (Anonymous guests)
      const namedUsers = users.filter(u => u.userName && !u.userName.startsWith('Anonymous'));
      setOnlineUsers(namedUsers);
    });
    socket.on('code_update', ({ fileId, newCode }) => {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content: newCode } : f));
    });
    socket.on('refresh_files', () => {
      // Re-fetch files when another guest leaves and their files are deleted
      fetchFiles();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('presence-update');
      socket.off('code_update');
      socket.off('refresh_files');
      disconnectSocket();
    };
  }, [token, user, sessionId, fetchFiles]);

  // ─── Code change ─────────────────────────────────────────────────────────
  const handleCodeChange = (fileId, value) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content: value } : f));
    socket.emit('code_change', { fileId, newCode: value });
    setActivities(prev => [{ 
      id: Date.now(), 
      type: 'save', 
      message: `Modified ${files.find(f => f.id === fileId)?.name || 'file'}`, 
      timestamp: new Date() 
    }, ...prev].slice(0, 20));

    if (window.saveTimeout) clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/${fileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value })
        });
      } catch (e) { console.error('Autosave failed', e); }
    }, 1000);
  };

  // ─── Create file/folder ───────────────────────────────────────────────────
  const handleCreateNode = useCallback(async (name, type, parentId = null) => {
    const ext = name.split('.').pop().toLowerCase();
    const defaultContent = type === 'file' ? (BOILERPLATES[ext] || '// Write your code here\n') : '';

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          type, 
          parentId, 
          content: defaultContent,
          ownerId: user?.id || null,
          sessionId,
          isGuest: !user
        })
      });
      
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Server failed to create node');
      }

      // Ensure we have a string ID for React state consistency
      const newNode = { 
        ...data, 
        id: data.id || data._id?.toString(),
        parentId: data.parentId?.toString() || null 
      };
      setFiles(prev => [...prev, newNode]);

      if (type === 'file') {
        const sid = newNode.id;
        setOpenFileIds(prev => prev.includes(sid) ? prev : [...prev, sid]);
        setCurrentFileId(sid);
        toast.success(`Created ${name}`);
      } else {
        toast.success(`Folder "${name}" created`);
      }
      setActivities(prev => [{ 
        id: Date.now(), 
        type: 'create', 
        message: `Created ${type} "${name}"`, 
        timestamp: new Date() 
      }, ...prev].slice(0, 20));
    } catch (e) {
      toast.error('Failed to create file');
      console.error('Creation error:', e);
    }
  }, [toast, user, sessionId]);

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteNode = useCallback(async (id) => {
    const node = files.find(f => f.id === id);
    // Custom confirm via toast (non-blocking would need a modal, we use a simple confirm here)
    if (!window.confirm(`Delete "${node?.name}"?`)) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id && f.parentId !== id));
      if (openFileIds.includes(id)) handleTabClose(id);
      toast.success(`Deleted "${node?.name}"`);
      setActivities(prev => [{ 
        id: Date.now(), 
        type: 'delete', 
        message: `Deleted "${node?.name}"`, 
        timestamp: new Date() 
      }, ...prev].slice(0, 20));
    } catch (e) {
      toast.error('Delete failed');
    }
  }, [files, openFileIds, toast]);

  // ─── Rename ───────────────────────────────────────────────────────────────
  const handleRenameNode = useCallback(async (id, newName) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      toast.info(`Renamed to "${newName}"`);
    } catch (e) { toast.error('Rename failed'); }
  }, [toast]);

  // ─── Language change ──────────────────────────────────────────────────────
  const handleLanguageChange = useCallback(async (fileId, newExt) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    const baseName = file.name.split('.')[0] || 'untitled';
    const newName = `${baseName}.${newExt}`;
    const newContent = BOILERPLATES[newExt] || '// Code here\n';
    try {
      await fetch(`${API_URL}/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, content: newContent })
      });
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName, content: newContent } : f));
    } catch (e) { console.error('Language change failed'); }
  }, [files]);

  // ─── Tab management ───────────────────────────────────────────────────────
  const handleFileSelect = (node) => {
    if (node.type === 'file') {
      const nid = node.id || node._id?.toString();
      if (!nid) return;
      setOpenFileIds(prev => prev.includes(nid) ? prev : [...prev, nid]);
      setCurrentFileId(nid);
    }
  };

  const handleTabClose = (id) => {
    const newOpen = openFileIds.filter(fId => fId !== id);
    setOpenFileIds(newOpen);
    if (currentFileId === id) setCurrentFileId(newOpen.length > 0 ? newOpen[newOpen.length - 1] : null);
  };

  // ─── Quick action (from welcome screen) ──────────────────────────────────
  const handleQuickAction = (action) => {
    const map = { 
      'new-js': 'main.js', 'new-py': 'main.py', 'new-java': 'Main.java', 'new-cpp': 'main.cpp',
      'new-go': 'main.go', 'new-rs': 'main.rs', 'new-rb': 'main.rb', 'new-php': 'main.php',
      'new-sh': 'script.sh', 'new-swift': 'main.swift'
    };
    if (map[action]) handleCreateNode(map[action], 'file', null);
  };

  // ─── Run Code ────────────────────────────────────────────────────────────
  const handleRunCode = async () => {
    if (!currentFile || isRunning) return;
    setIsRunning(true);
    const startTime = Date.now();

    const ext = currentFile.name.split('.').pop();
    const langMap = { py: 'python', java: 'java', cpp: 'cpp', c: 'c', js: 'javascript', rb: 'ruby', go: 'go', rs: 'rust', php: 'php', sh: 'bash', swift: 'swift', ts: 'typescript' };
    const language = langMap[ext] || 'javascript';

    setLogs(prev => [...prev, { type: 'info', message: `▶ Running ${currentFile.name}...` }]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, content: currentFile.content, stdin })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown Server Error' }));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }
      
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setLastExecTime(elapsed);

      if (data.isError) {
        setLogs(prev => [...prev, { type: 'error', message: data.output || 'Unknown Error', time: elapsed }]);
        toast.error('Execution failed');
      } else {
        setLogs(prev => [...prev, { type: 'info', message: data.output, time: elapsed }]);
        toast.success(`Ran in ${elapsed}ms`);
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      setLogs(prev => [...prev, { type: 'error', message: `DevOrbit: ${err.message}. (Make sure backend is running on port 5050)` }]);
      toast.error('Cannot reach execution server');
    } finally {
      setIsRunning(false);
    }

  };

  // ─── Keybinds ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault();
        setShowPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentFile, handleRunCode]);
  
  // ─── Neural Protection (Anti-Inspect) ──────────────────────────────────────
  useEffect(() => {
    // Disable right-click globally
    const handleContextMenu = (e) => e.preventDefault();
    
    // Disable inspection shortcuts
    const handleInspectKey = (e) => {
      if (
        e.key === 'F12' || 
        ((e.ctrlKey || e.metaKey) && (e.shiftKey) && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u'))
      ) {
        e.preventDefault();
        toast.info('Neural Protection Active: Inspection blocked.');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleInspectKey);
    
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleInspectKey);
    };
  }, [toast]);


  return (
    <div className="devorbit-layout">
      <Sidebar
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        files={files}
        onFileCreate={handleCreateNode}
        onFileDelete={handleDeleteNode}
        onFileRename={handleRenameNode}
        onFileSelect={handleFileSelect}
        currentFileId={currentFileId}
      />

      <div className="main-content">
        {/* Top Navigation Bar */}
        <div className="top-nav glass-panel-inner">
          {/* Left: Logo */}
          <div className="nav-left">
            <div className="nav-logo">
              <Zap size={21} strokeWidth={2.5} />
            </div>
            <span className="nav-brand text-gradient">DevOrbit</span>
            {currentFile && (
              <span className="nav-breadcrumb text-muted">
                <span className="breadcrumb-sep">/</span>
                {currentFile.name}
              </span>
            )}
          </div>

          {/* Center: Clock */}
          <div className="nav-center">
            <span className="live-clock">{clock}</span>
          </div>

          {/* Right: Actions */}
          <div className="nav-right">
            {/* Presence Avatars */}
            <div className="presence-avatars">
              {onlineUsers.slice(0, 4).map(u => (
                <div 
                  key={u.id} 
                  className="user-dot" 
                  style={{ '--user-color': u.userColor }}
                  title={`${u.userName} ${u.id === socket.id ? '(You)' : ''}`}
                >
                  {u.userName[0].toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 4 && (
                <div className="user-dot more-users">+{onlineUsers.length - 4}</div>
              )}
            </div>

            <span className="nav-divider" />

            {/* Connection Status */}
            <span className={`conn-status ${connected ? 'online' : 'offline'}`} title={connected ? 'Real-time sync active' : 'Not connected'}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="conn-dot" />
            </span>

            {user ? (
              <div className="user-info">
                <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
                <span className="user-name text-secondary">{user.name}</span>
                <button className="icon-btn nav-icon-btn" onClick={() => { logout(); toast.info('Signed out'); }} title="Sign Out">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button className="btn-signin" onClick={() => setShowAuthModal(true)}>
                <LogIn size={14} /> Sign In
              </button>
            )}

            <button 
              className="icon-btn nav-icon-btn theme-btn"
              onClick={() => {
                const themes = ['midnight', 'cobalt', 'emerald', 'noir', 'vivid'];
                const next = themes[(themes.indexOf(theme) + 1) % themes.length];
                setTheme(next);
                toast.success(`Theme: ${next.charAt(0).toUpperCase() + next.slice(1)}`);
              }}
              title="Switch Theme"
            >
              <Palette size={18} />
            </button>

            <button 
              className={`icon-btn nav-icon-btn ai-toggle-btn ${showAiAssistant ? 'active' : ''}`}
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              title="DevOrbit AI Assistant"
            >
              <Sparkles size={18} className={showAiAssistant ? 'neon-text' : ''} />
            </button>

            <button
              className={`btn-run ${isRunning ? 'running' : ''}`}
              onClick={handleRunCode}
              disabled={!currentFile || isRunning}
              title="Run Code (Ctrl+Enter)"
            >
              {isRunning
                ? <><span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running...</>
                : <><Play size={14} fill="currentColor" /> Run</>
              }
            </button>
          </div>
        </div>

        {/* Editor + Console Area */}
        <div className="editor-area">
          <div className="editor-wrapper">
            <MonacoWorkspace
              currentFile={currentFile}
              openFiles={openFilesList}
              onCodeChange={handleCodeChange}
              onTabSelect={setCurrentFileId}
              onTabClose={handleTabClose}
              onLanguageChange={handleLanguageChange}
              onQuickAction={handleQuickAction}
              activities={activities}
              files={files}
            />
          </div>
          <BottomConsole 
            logs={logs} 
            onClear={() => setLogs([])} 
            lastExecTime={lastExecTime} 
            stdin={stdin}
            onStdinChange={setStdin}
          />
        </div>
      </div>

      <AiAssistant 
        isOpen={showAiAssistant} 
        onClose={() => setShowAiAssistant(false)} 
        currentFile={currentFile}
      />

      <CommandPalette 
        isOpen={showPalette} 
        onClose={() => setShowPalette(false)}
        files={files}
        onFileSelect={(id) => {
          setOpenFileIds(prev => prev.includes(id) ? prev : [...prev, id]);
          setCurrentFileId(id);
          setShowPalette(false);
        }}
        commands={[
          { id: 'clear-logs', label: 'Clear Console Logs', action: () => setLogs([]) },
          { id: 'toggle-ai', label: 'Toggle AI Assistant', action: () => setShowAiAssistant(!showAiAssistant) },
          { id: 'new-js', label: 'New JavaScript File', action: () => handleQuickAction('new-js') },
          { id: 'new-py', label: 'New Python File', action: () => handleQuickAction('new-py') },
          { id: 'new-go', label: 'New Go File', action: () => handleQuickAction('new-go') },
          { id: 'new-rs', label: 'New Rust File', action: () => handleQuickAction('new-rs') },
          { id: 'new-rb', label: 'New Ruby File', action: () => handleQuickAction('new-rb') },
          { id: 'new-php', label: 'New PHP File', action: () => handleQuickAction('new-php') },
          { id: 'new-sh', label: 'New Bash Script', action: () => handleQuickAction('new-sh') },
          { id: 'new-swift', label: 'New Swift File', action: () => handleQuickAction('new-swift') },
        ]}
      />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default App;
