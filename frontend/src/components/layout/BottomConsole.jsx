import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Play, XCircle, Copy, ChevronUp, ChevronDown, CheckCheck, Clock } from 'lucide-react';
import './BottomConsole.css';

const BottomConsole = ({ logs, onClear, lastExecTime }) => {
  const [height, setHeight] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('output');
  const bodyRef = useRef(null);
  const startY = useRef(0);
  const startH = useRef(0);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY;
    startH.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      const delta = startY.current - e.clientY;
      const newH = Math.min(500, Math.max(100, startH.current + delta));
      setHeight(newH);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  const handleCopy = () => {
    const text = logs.map(l => `${l.type === 'error' ? '[ERR]' : '[OUT]'} ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="bottom-console glass-panel-inner" style={{ height }}>
      {/* Resize Handle */}
      <div
        className={`console-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="console-header">
        <div className="console-tabs">
          <button
            className={`console-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            <Play size={13} /> Output
          </button>
          <button
            className={`console-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={13} /> Console
          </button>
        </div>

        <div className="console-meta">
          {lastExecTime != null && (
            <span className="exec-time">
              <Clock size={11} />
              {lastExecTime}ms
            </span>
          )}
          <span className="log-count">{logs.length} item{logs.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="console-actions">
          <button
            className={`console-action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy output"
            disabled={logs.length === 0}
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
          </button>
          <button
            className="console-action-btn clear-btn"
            onClick={onClear}
            title="Clear console"
            disabled={logs.length === 0}
          >
            <XCircle size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="console-body" ref={bodyRef}>
        {logs.length === 0 ? (
          <div className="console-empty">
            <Terminal size={20} style={{ opacity: 0.2, marginBottom: '0.4rem' }} />
            <span>DevOrbit sandbox ready. Run your code to see output.</span>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`log-line log-${log.type} animate-slide-up`}>
              <span className="log-prefix">{log.type === 'error' ? '✗' : '›'}</span>
              <span className="log-message">{log.message}</span>
              {log.time && <span className="log-time">{log.time}ms</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BottomConsole;
