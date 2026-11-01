import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';

const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'food': return 'fa-utensils';
    case 'transport': return 'fa-car';
    case 'utilities': return 'fa-bolt';
    case 'shopping': return 'fa-bag-shopping';
    case 'entertainment': return 'fa-film';
    case 'subscriptions': return 'fa-repeat';
    case 'health': return 'fa-heart-pulse';
    case 'income': return 'fa-wallet';
    case 'transfer': return 'fa-arrow-right-arrow-left';
    default: return 'fa-receipt';
  }
};

function Chat() {
  const { user } = useAuth();
  const { t, getCategoryName, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'transaction'

  // Ask AI states
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: t('chat.welcome_chat') }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Add Transaction states
  const [txnInput, setTxnInput] = useState('');
  const [txnHistory, setTxnHistory] = useState([
    {
      sender: 'bot',
      text: t('chat.welcome_txn')
    }
  ]);
  const [txnLoading, setTxnLoading] = useState(false);

  // Load chat histories from localStorage on user change or mount
  useEffect(() => {
    if (user) {
      const savedChat = localStorage.getItem(`chat_history_${user.user_id}`);
      if (savedChat) {
        setChatHistory(JSON.parse(savedChat));
      } else {
        setChatHistory([
          { sender: 'bot', text: t('chat.welcome_chat') }
        ]);
      }

      const savedTxn = localStorage.getItem(`chat_txn_history_${user.user_id}`);
      if (savedTxn) {
        setTxnHistory(JSON.parse(savedTxn));
      } else {
        setTxnHistory([
          {
            sender: 'bot',
            text: t('chat.welcome_txn')
          }
        ]);
      }
    }
  }, [user]);

  // If chat/txn has only the initial welcome message, refresh it when language changes
  useEffect(() => {
    setChatHistory(prev => {
      if (prev.length === 1 && prev[0].sender === 'bot' && !prev[0].transaction) {
        return [{ sender: 'bot', text: t('chat.welcome_chat') }];
      }
      return prev;
    });
    setTxnHistory(prev => {
      if (prev.length === 1 && prev[0].sender === 'bot' && !prev[0].transaction) {
        return [{ sender: 'bot', text: t('chat.welcome_txn') }];
      }
      return prev;
    });
  }, [language]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`chat_history_${user.user_id}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, user]);

  // Save txn history to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`chat_txn_history_${user.user_id}`, JSON.stringify(txnHistory));
    }
  }, [txnHistory, user]);

  const sendMessage = async () => {
    if (activeTab === 'chat') {
      if (!chatInput.trim()) return;
      const msg = chatInput.trim();
      setChatHistory(prev => [...prev, { sender: 'user', text: msg }]);
      setChatInput('');
      setChatLoading(true);
      
      try {
        const historyPayload = [];
        for (const h of chatHistory) {
          if (historyPayload.length === 0 && h.sender === 'bot') {
            continue;
          }
          historyPayload.push({
            role: h.sender === 'user' ? 'user' : 'assistant',
            content: h.text
          });
        }

        const res = await apiClient.post('/chat', { message: msg, history: historyPayload });
        setChatHistory(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
      } catch (err) {
        setChatHistory(prev => [...prev, { sender: 'bot', text: t('chat.error_connect') }]);
      }
      setChatLoading(false);
    } else {
      if (!txnInput.trim()) return;
      const msg = txnInput.trim();
      setTxnHistory(prev => [...prev, { sender: 'user', text: msg }]);
      setTxnInput('');
      setTxnLoading(true);
      
      try {
        const res = await apiClient.post('/chat/transaction', { message: msg });
        if (res.data.status === 'saved') {
          setTxnHistory(prev => [...prev, {
            sender: 'bot',
            text: res.data.message,
            status: 'saved',
            transaction: res.data.transaction
          }]);
        } else {
          setTxnHistory(prev => [...prev, {
            sender: 'bot',
            text: res.data.detail || t('chat.error_parse'),
            status: 'error'
          }]);
        }
      } catch (err) {
        setTxnHistory(prev => [...prev, { sender: 'bot', text: t('chat.error_connect') }]);
      }
      setTxnLoading(false);
    }
  };

  const clearHistory = () => {
    const isChat = activeTab === 'chat';
    const confirmMessage = isChat
      ? t('chat.confirm_clear_chat')
      : t('chat.confirm_clear_txn');

    if (window.confirm(confirmMessage)) {
      if (isChat) {
        const initial = [
          { sender: 'bot', text: t('chat.welcome_chat') }
        ];
        setChatHistory(initial);
        if (user) {
          localStorage.removeItem(`chat_history_${user.user_id}`);
        }
      } else {
        const initial = [
          {
            sender: 'bot',
            text: t('chat.welcome_txn')
          }
        ];
        setTxnHistory(initial);
        if (user) {
          localStorage.removeItem(`chat_txn_history_${user.user_id}`);
        }
      }
    }
  };

  const currentHistory = activeTab === 'chat' ? chatHistory : txnHistory;
  const currentLoading = activeTab === 'chat' ? chatLoading : txnLoading;
  const currentInputValue = activeTab === 'chat' ? chatInput : txnInput;
  const setCurrentInput = activeTab === 'chat' ? setChatInput : setTxnInput;
  const placeholderText = activeTab === 'chat' 
    ? t('chat.chat_placeholder') 
    : t('chat.txn_placeholder');

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 0, marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>
          <i className="fa-solid fa-robot" style={{ color: 'var(--primary)' }}></i> {t('chat.title')}
        </h3>
        <button 
          onClick={clearHistory} 
          title={t('chat.clear_tooltip')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            fontSize: '1.1rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </div>

      {/* Tabs navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(255, 255, 255, 0.3)',
        padding: '4px',
        borderRadius: '14px',
        marginBottom: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        width: 'fit-content'
      }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'chat' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' : 'transparent',
            color: activeTab === 'chat' ? 'white' : 'var(--text-muted)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'chat' ? '0 4px 10px rgba(37,99,235,0.2)' : 'none'
          }}
        >
          <i className="fa-solid fa-comments" style={{ marginRight: '8px' }}></i> {t('chat.tab_chat')}
        </button>
        <button
          onClick={() => setActiveTab('transaction')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'transaction' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' : 'transparent',
            color: activeTab === 'transaction' ? 'white' : 'var(--text-muted)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'transaction' ? '0 4px 10px rgba(37,99,235,0.2)' : 'none'
          }}
        >
          <i className="fa-solid fa-receipt" style={{ marginRight: '8px' }}></i> {t('chat.tab_transaction')}
        </button>
      </div>

      <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom: '1.5rem'}}>
        {activeTab === 'chat' ? t('chat.chat_desc') : t('chat.txn_desc')}
      </p>
      
      <div className="chat-box" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '500px',
        overflowY: 'auto',
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.4)',
        border: '1px solid rgba(255,255,255,0.8)',
        borderRadius: 'var(--radius)',
        marginBottom: '1rem',
        boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.02)'
      }}>
        {currentHistory.map((msg, i) => (
          <div key={i} style={{
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            maxWidth: '80%',
            lineHeight: 1.6,
            fontSize: '0.95rem',
            background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' : 'rgba(255, 255, 255, 0.8)',
            color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
            borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
            border: msg.sender === 'bot' ? '1px solid rgba(255,255,255,1)' : 'none',
            boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(37,99,235,0.3)' : '0 4px 15px rgba(0,0,0,0.05)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {msg.sender === 'bot' && <strong style={{color: 'var(--primary-dark)'}}>BudgetBot AI<br/></strong>}
            {msg.sender === 'bot' ? (
              <>
                {msg.status === 'error' ? (
                  <div style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p style={{ margin: '0.35rem 0' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '0.35rem 0 0.35rem 1.2rem', paddingLeft: '1rem' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '0.35rem 0 0.35rem 1.2rem', paddingLeft: '1rem' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ margin: '0.2rem 0' }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                      code: ({ children }) => <code style={{ background: 'rgba(37,99,235,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{children}</code>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}

                {msg.status === 'saved' && msg.transaction && (
                  <div style={{
                    marginTop: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    minWidth: '260px',
                    color: 'var(--text-main)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Top colored highlight line */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                    }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                        <i className="fa-solid fa-circle-check"></i> {t('chat.card_saved')}
                      </span>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#059669',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>
                        {msg.transaction.confidence === 'high' ? t('chat.high_conf') : msg.transaction.confidence === 'medium' ? t('chat.med_conf') : t('chat.low_conf')}
                      </span>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px dashed rgba(0,0,0,0.1)', margin: '0.4rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('chat.card_desc')}</span>
                      <strong style={{ textAlign: 'right' }}>{msg.transaction.description}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('chat.card_date')}</span>
                      <strong>{msg.transaction.date}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('chat.card_cat')}</span>
                      <span style={{
                        background: 'var(--primary-light)',
                        color: 'var(--primary-dark)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <i className={`fa-solid ${getCategoryIcon(msg.transaction.category)}`}></i> {getCategoryName(msg.transaction.category)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('chat.card_amt')}</span>
                      <strong style={{ color: msg.transaction.amount >= 0 ? 'var(--success)' : 'var(--error)', fontSize: '1rem' }}>
                        {msg.transaction.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(msg.transaction.amount))}
                      </strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>{msg.text}</div>
            )}
          </div>
        ))}
        {currentLoading && (
          <div style={{alignSelf: 'flex-start', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.8)', padding: '0.75rem 1rem', borderRadius: '16px', borderBottomLeftRadius: '4px', border: '1px solid white', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}}>
            <span className="spinner"></span> {t('chat.analyzing')}
          </div>
        )}
      </div>
      
      <div className="chat-input" style={{display: 'flex', gap: '0.5rem'}}>
        <input 
            type="text" 
          value={currentInputValue}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={placeholderText} 
          style={{flex: 1}}
          disabled={currentLoading}
        />
        <button className="btn-primary" onClick={sendMessage} disabled={currentLoading}>
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
}

export default Chat;
