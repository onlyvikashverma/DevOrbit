import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, CheckCheck, Loader2, Sparkles } from 'lucide-react';
import './ChatAssistant.css';

const MOCK_AI_RESPONSES = [
  { text: "I can help optimize that! Try using a **Set** for O(1) lookups instead of an array:\n\n```javascript\nconst seen = new Set();\nconst unique = arr.filter(x => !seen.has(x) && seen.add(x));\n```\n\nThis brings the time complexity from O(n²) to O(n)." },
  { text: "Here's a minimal **Express server** boilerplate:\n\n```javascript\nconst express = require('express');\nconst app = express();\napp.use(express.json());\n\napp.get('/', (req, res) => res.send('Hello!'));\n\napp.listen(3000, () => console.log('Server on port 3000'));\n```" },
  { text: "That looks like an **async state update issue**. The problem is that `setState` is batched. Try this:\n\n```javascript\nuseEffect(() => {\n  fetchData().then(data => {\n    setItems(data);\n  });\n}, []);\n```\n\nAlways handle async operations inside `useEffect`." },
  { text: "Here's a **Python decorator** template:\n\n```python\nimport functools\n\ndef my_decorator(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        print('Before call')\n        result = func(*args, **kwargs)\n        print('After call')\n        return result\n    return wrapper\n\n@my_decorator\ndef greet(name):\n    print(f'Hello, {name}!')\n```" },
];

// ─── Code Block Renderer ──────────────────────────────────────────────────────
const CodeBlock = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang-badge">{lang || 'code'}</span>
        <button className={`code-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="code-block-body"><code>{code}</code></pre>
    </div>
  );
};

// ─── Message Renderer (handles markdown-lite: **bold**, ```code```) ───────────
const MessageContent = ({ text }) => {
  const parts = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;

  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', lang: match[1], content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return (
    <div className="message-content-inner">
      {parts.map((part, i) => {
        if (part.type === 'code') return <CodeBlock key={i} code={part.content} lang={part.lang} />;
        // Render **bold** in text segments
        const segments = part.content.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className="msg-text">
            {segments.map((seg, j) =>
              j % 2 === 1 ? <strong key={j}>{seg}</strong> : seg
            )}
          </p>
        );
      })}
    </div>
  );
};

// ─── Typing dots ──────────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="typing-dots">
    <span /><span /><span />
  </div>
);

// ─── ChatAssistant ────────────────────────────────────────────────────────────
const ChatAssistant = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm **DevOrbit AI**. Ask me anything about your code — I can help debug, explain, or generate snippets." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const r = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
      setMessages(prev => [...prev, { role: 'assistant', text: r.text }]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="chat-assistant column-layout">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="ai-avatar">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="chat-title">DevOrbit AI</div>
            <div className="chat-subtitle">Coding Assistant</div>
          </div>
        </div>
        <span className="ai-online-dot" />
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className="msg-avatar">
              {msg.role === 'user'
                ? <User size={13} />
                : <Bot size={13} />
              }
            </div>
            <div className={`message-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
              <MessageContent text={msg.text} />
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message-row assistant">
            <div className="msg-avatar"><Bot size={13} /></div>
            <div className="message-bubble bubble-ai">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          className="futuristic-input chat-input"
          placeholder="Ask a coding question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isTyping}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim() || isTyping}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export default ChatAssistant;
