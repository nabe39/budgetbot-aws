import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Auth.css';

export default function Login() {
  const { login, loading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/transactions');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      {/* Language Switcher in Auth */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <button
          onClick={toggleLanguage}
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            borderRadius: '20px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--primary-dark)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fa-solid fa-globe"></i>
          <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
        </button>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">💰 BudgetBot</h1>
          <p className="auth-subtitle">{t('auth.login_title')}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="login-username">{t('auth.username')}</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.username')}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">{t('auth.password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('auth.signing_in') : t('auth.signin_btn')}
          </button>
        </form>
        <p className="auth-footer">
          {t('auth.no_account')} <Link to="/register">{t('auth.create_one')}</Link>
        </p>
      </div>
    </div>
  );
}
