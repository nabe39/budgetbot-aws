import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Auth.css';

export default function Register() {
  const { register, loading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError(t('auth.pass_min_length'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.pass_mismatch'));
      return;
    }

    const result = await register(fullName, username, password);
    if (result.success) {
      setSuccess(t('auth.account_created'));
      setTimeout(() => navigate('/login'), 1500);
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
          <p className="auth-subtitle">{t('auth.register_title')}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          <div className="form-group">
            <label htmlFor="reg-fullname">{t('auth.fullname')}</label>
            <input
              id="reg-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyen Van A"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-username">{t('auth.username')}</label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nguyenvana"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">{t('auth.password')}</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">{t('auth.confirm_password')}</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('auth.creating') : t('auth.signup_btn')}
          </button>
        </form>
        <p className="auth-footer">
          {t('auth.has_account')} <Link to="/login">{t('auth.signin_link')}</Link>
        </p>
      </div>
    </div>
  );
}
