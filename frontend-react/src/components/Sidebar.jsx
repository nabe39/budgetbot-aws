import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Sidebar.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const toggleSidebar = () => {
    document.querySelector('.sidebar')?.classList.toggle('collapsed');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>
          <i className="fa-solid fa-wallet"></i> 
          <span className="nav-text">BudgetBot</span>
        </h2>
        <button className="toggle-btn" onClick={toggleSidebar}>
          <i className="fa-solid fa-bars"></i>
        </button>
      </div>
      
      <ul className="nav-links">
        <NavLink to="/overview" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-chart-pie"></i> 
          <span className="nav-text">{t('nav.overview')}</span>
        </NavLink>
        <NavLink to="/transactions" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-list-check"></i> 
          <span className="nav-text">{t('nav.transactions')}</span>
        </NavLink>
        <NavLink to="/chat" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-comment-dots"></i> 
          <span className="nav-text">{t('nav.ask_ai')}</span>
        </NavLink>
        <NavLink to="/coach" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-lightbulb"></i> 
          <span className="nav-text">{t('nav.budget_coach')}</span>
        </NavLink>
        <NavLink to="/limits" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-bell"></i> 
          <span className="nav-text">{t('nav.caps_alerts')}</span>
        </NavLink>
      </ul>
      
      {user && (
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="user-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center', overflow: 'hidden' }}>
            <div className="avatar">{user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}</div>
            <div className="nav-text">
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.username}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.5rem', transition: 'transform 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title={t('nav.logout')}>
            <i className="fa-solid fa-right-from-bracket" style={{ fontSize: '1.2rem' }}></i>
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
