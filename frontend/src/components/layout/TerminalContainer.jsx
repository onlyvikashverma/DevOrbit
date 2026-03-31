import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { socket } from '../../services/socket';
import 'xterm/css/xterm.css';
import './TerminalContainer.css';

const TerminalContainer = () => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: 'transparent',
        foreground: '#f1f5f9',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#0a0e1a',
        brightBlack: '#475569',
      },
      fontSize: 13,
      fontFamily: '"JetBrains Mono", monospace',
      allowTransparency: true,
      rows: 20,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;34mDevOrbit\x1b[0m \x1b[1;32mInteractive Terminal\x1b[0m');
    term.writeln('Connecting to local shell...');

    // Socket listeners
    const onOutput = (data) => {
      term.write(data);
    };

    socket.on('terminal-output', onOutput);

    // Terminal input to socket
    term.onData((data) => {
      socket.emit('terminal-input', data);
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('terminal-output', onOutput);
      term.dispose();
    };
  }, []);

  return (
    <div className="terminal-container-wrapper">
      <div className="terminal-target" ref={terminalRef} />
    </div>
  );
};

export default TerminalContainer;
