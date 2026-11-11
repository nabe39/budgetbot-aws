import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import './Topbar.css';

function Topbar() {
  const [status, setStatus] = useState('checking');
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.get('/health');
        setStatus('online');
      } catch (err) {
        setStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const routeKeys = {
    '/overview': 'title.overview',
    '/transactions': 'title.transactions',
    '/chat': 'title.chat',
    '/coach': 'title.coach',
    '/limits': 'title.limits',
  };

  const titleKey = routeKeys[location.pathname];
  const title = titleKey ? t(titleKey) : 'BudgetBot';

  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="status-pills">
          {status === 'checking' && <><span className="spinner"></span> {t('topbar.checking_api')}</>}
          {status === 'online' && <span style={{ color: 'var(--success)' }}><i className="fa-solid fa-circle-check"></i> {t('topbar.api_connected')}</span>}
          {status === 'offline' && <span style={{ color: 'var(--error)' }}><i className="fa-solid fa-circle-xmark"></i> {t('topbar.backend_offline')}</span>}
        </div>

        {/* Language Switcher */}
        <div className="lang-switcher">
          <button
            type="button"
            className={`lang-btn ${language === 'vi' ? 'active' : ''}`}
            onClick={() => setLanguage('vi')}
            title="Chuyển sang Tiếng Việt"
          >
            VI
          </button>
          <button
            type="button"
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
            title="Switch to English"
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
