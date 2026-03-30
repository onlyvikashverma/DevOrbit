import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { X, Eye, EyeOff, Zap } from 'lucide-react';
import './AuthModal.css';

const AuthModal = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin
          ? { email: formData.email, password: formData.password }
          : formData
        )
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      setAuth(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={18} /></button>

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap size={22} strokeWidth={2} />
          </div>
          <span className="auth-logo-text text-gradient">DevOrbit</span>
        </div>

        <h2 className="auth-heading">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="auth-sub text-muted">
          {isLogin ? 'Sign in to continue to your workspace' : 'Join DevOrbit and start coding'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input
                type="text"
                placeholder="Your name"
                required
                className="futuristic-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              className="futuristic-input"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                className="futuristic-input password-input"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading
              ? <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Please wait...</>
              : isLogin ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <p className="auth-switch text-muted">
          {isLogin ? "New to DevOrbit? " : "Already have an account? "}
          <span className="auth-link" onClick={() => { setIsLogin(!isLogin); setError(null); }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
