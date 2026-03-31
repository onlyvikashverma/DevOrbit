import React from 'react';
import { 
  Zap, FileCode, Cpu, Coffee, Terminal,
  Type, Play, Save, Monitor
} from 'lucide-react';
import { motion } from 'framer-motion';
import './ProjectDashboard.css';

const ProjectDashboard = ({ files, activities, onQuickAction }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const actions = [
    { id: 'new-js', label: 'New JS File', icon: <FileCode size={18} />, color: '#fbbf24' },
    { id: 'new-py', label: 'New Python File', icon: <Cpu size={18} />, color: '#4ade80' },
    { id: 'new-java', label: 'New Java File', icon: <Coffee size={18} />, color: '#fb923c' },
    { id: 'new-cpp', label: 'New C++ File', icon: <Terminal size={18} />, color: '#c084fc' }
  ];

  const shortcuts = [
    { key: 'Ctrl+Enter', action: 'Run Code' },
    { key: 'Ctrl+S', action: 'Save' },
    { key: 'Ctrl+`', action: 'Terminal' }
  ];

  return (
    <motion.div 
      className="project-dashboard-simple"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="dashboard-content-wrapper">
        <div className="logo-section">
          <div className="main-logo-circle">
            <Zap size={32} fill="var(--accent-neon-blue)" color="var(--accent-neon-blue)" />
          </div>
          <h1 className="dashboard-title">DevOrbit IDE</h1>
          <p className="dashboard-subtitle">Select a file or start with a quick action</p>
        </div>

        <div className="simple-actions-grid">
          {actions.map(action => (
            <button 
              key={action.id}
              className="simple-action-btn"
              onClick={() => onQuickAction(action.id)}
            >
              <span className="btn-icon" style={{ color: action.color }}>{action.icon}</span>
              <span className="btn-label">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="shortcuts-row">
          {shortcuts.map((s, i) => (
            <div key={i} className="shortcut-item">
              <span className="kdb-chip">{s.key}</span>
              <span className="shortcut-action">{s.action}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectDashboard;
