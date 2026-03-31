import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, Bot, User, Copy, CheckCheck, Loader2, 
  Sparkles, X, Terminal, Cpu, Zap, Brain, 
  Code, Wand2, Lightbulb, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AiAssistant.css';

const AI_SUGGESTIONS = [
  { id: 'refactor', label: 'Refactor Code', icon: <Wand2 size={14} />, prompt: 'Can you refactor this code for better readability and performance?' },
  { id: 'explain',  label: 'Explain Logic', icon: <Lightbulb size={14} />, prompt: 'Explain how this code works in simple terms.' },
  { id: 'optimize', label: 'Optimize',     icon: <Zap size={14} />,      prompt: 'Suggest performance optimizations for this snippet.' },
  { id: 'tests',    label: 'Generate Tests',icon: <Code size={14} />,     prompt: 'Generate unit tests for this code.' }
];

const AiAssistant = ({ isOpen, onClose, currentFile }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm **DevOrbit AI**. I'm currently analyzing your workspace. How can I assist with your code today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (customPrompt = null) => {
    const text = customPrompt || input.trim();
    if (!text || isTyping) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    // Simulate AI Processing with the current file context
    setTimeout(() => {
      let responseText = "";
      
      if (text.toLowerCase().includes('refactor')) {
        responseText = `Based on your current file **${currentFile?.name || 'Untitled'}**, I suggest extracting the logic into smaller, pure functions. This improves testability and follows the Single Responsibility Principle.`;
      } else if (text.toLowerCase().includes('explain')) {
        responseText = `This code appears to handle **${currentFile?.name?.split('.')[1] || 'generic'}** logic. It uses modern hooks/patterns to manage state and side effects efficiently.`;
      } else {
        responseText = "I've analyzed the current buffer. The implementation looks solid, but consider adding more error boundaries for production edge cases.";
      }

      setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="ai-assistant-drawer glass-panel"
        >
          {/* Header */}
          <div className="ai-header">
            <div className="ai-brand">
              <div className="ai-icon-glow">
                <Brain size={20} className="neon-icon" />
              </div>
              <div className="ai-status">
                <span className="ai-name">DevOrbit AI</span>
                <span className="ai-active-info">Analyzing {currentFile?.name || 'Workspace'}</span>
              </div>
            </div>
            <button className="close-ai-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="ai-quick-actions">
            {AI_SUGGESTIONS.map(s => (
              <button 
                key={s.id} 
                className="ai-chip-btn"
                onClick={() => handleSend(s.prompt)}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Chat History */}
          <div className="ai-chat-body custom-scrollbar">
            {messages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`ai-message-row ${msg.role}`}
              >
                <div className="ai-avatar-msg">
                   {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`ai-bubble ${msg.role}`}>
                  <div className="ai-bubble-content">
                    {msg.text.split('**').map((part, index) => 
                      index % 2 === 1 ? <strong key={index} className="neon-text">{part}</strong> : part
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="ai-message-row assistant">
                <div className="ai-avatar-msg"><Bot size={14} /></div>
                <div className="ai-bubble assistant typing">
                  <div className="typing-indicator-hologram">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="ai-input-wrapper">
            <div className="ai-input-box glass-panel-inner">
              <Sparkles size={16} className="ai-spark-icon" />
              <textarea 
                className="ai-textarea"
                placeholder="Ask DevOrbit AI anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                className="ai-send-btn" 
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="ai-footer-info">
              <Cpu size={10} />
              <span>Neural Processing Active</span>
            </div>
          </div>

          {/* Background Data Stream Effect */}
          <div className="neural-background">
            <div className="grid-overlay"></div>
            <div className="data-particles"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AiAssistant;
