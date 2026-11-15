import { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/format';
import { useUpload } from '../context/UploadContext';
import { useLanguage } from '../context/LanguageContext';
import './Transactions.css';

const STANDARD_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Subscriptions',
  'Income',
  'Transfer',
  'Other'
];

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [category, setCategory] = useState('');
  const [editingTxn, setEditingTxn] = useState(null);
  const [debug, setDebug] = useState(false);

  const { refreshTrigger } = useUpload();
  const { t, getCategoryName, getConfidenceLabel } = useLanguage();

  useEffect(() => {
    window.enableDebug = () => setDebug(true);
    window.disableDebug = () => setDebug(false);
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Add Transaction state
  const [addingTxn, setAddingTxn] = useState(false);
  const [newTxn, setNewTxn] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Food',
    type: 'out'
  });

  const refreshTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDate) {
        params.date = selectedDate;
        params.month = selectedDate;
      }
      if (category) params.category = category;
      const res = await apiClient.get('/transactions', { params });
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedDate) {
          params.date = selectedDate;
          params.month = selectedDate;
        }
        if (category) params.category = category;
        const res = await apiClient.get('/transactions', { params });
        if (!isActive) return;
        setTransactions(res.data.transactions || []);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadTransactions();

    return () => {
      isActive = false;
    };
  }, [selectedDate, category, refreshTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm(t('txn.delete_confirm'))) return;
    try {
      await apiClient.delete(`/transactions/${encodeURIComponent(id)}`);
      refreshTransactions();
    } catch (err) {
      alert(t('txn.delete_failed') + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalAmount = editingTxn.type === 'out'
        ? -Math.abs(parseFloat(editingTxn.amount))
        : Math.abs(parseFloat(editingTxn.amount));

      await apiClient.put(`/transactions/${encodeURIComponent(editingTxn.id)}`, {
        date: editingTxn.date,
        description: editingTxn.description,
        amount: finalAmount,
        category: editingTxn.category,
        confidence: editingTxn.confidence || 'high'
      });
      setEditingTxn(null);
      refreshTransactions();
    } catch (err) {
      alert(t('txn.edit_failed') + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalAmount = newTxn.type === 'out'
        ? -Math.abs(parseFloat(newTxn.amount))
        : Math.abs(parseFloat(newTxn.amount));

      await apiClient.post('/transactions', {
        date: newTxn.date,
        description: newTxn.description,
        amount: finalAmount,
        category: newTxn.category || 'Food',
        confidence: 'high'
      });
      setAddingTxn(false);
      setNewTxn({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'Food',
        type: 'out'
      });
      refreshTransactions();
    } catch (err) {
      alert(t('txn.add_failed') + (err.response?.data?.detail || err.message));
    }
  };

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'amount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [transactions, sortConfig]);

  // Quick summary stats for current view
  const summaryStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (amt >= 0) totalIn += amt;
      else totalOut += Math.abs(amt);
    }
    return {
      count: transactions.length,
      income: totalIn,
      expense: totalOut,
      net: totalIn - totalOut
    };
  }, [transactions]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / itemsPerPage));
  const currentTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(start, start + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  // Confidence badge renderer
  const renderConfidenceBadge = (confidence) => {
    const conf = (confidence || '').toLowerCase();
    const label = getConfidenceLabel(confidence);
    if (conf === 'high') {
      return (
        <span className="badge-confidence badge-confidence-high">
          <i className="fa-solid fa-circle-check"></i> {label}
        </span>
      );
    }
    if (conf === 'medium') {
      return (
        <span className="badge-confidence badge-confidence-medium">
          <i className="fa-solid fa-triangle-exclamation"></i> {label}
        </span>
      );
    }
    if (conf === 'low') {
      return (
        <span className="badge-confidence badge-confidence-low">
          <i className="fa-solid fa-circle-exclamation"></i> {label}
        </span>
      );
    }
    return (
      <span className="badge-confidence badge-confidence-na">
        {label}
      </span>
    );
  };

  // Generate pagination buttons
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button key={1} className={`page-num-btn ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="dots-prev" style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      buttons.push(
        <button
          key={p}
          className={`page-num-btn ${currentPage === p ? 'active' : ''}`}
          onClick={() => setCurrentPage(p)}
        >
          {p}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="dots-next" style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          className={`page-num-btn ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => setCurrentPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="transactions-page">
      {/* ADD TRANSACTION MODAL */}
      {addingTxn && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
          <div className="card" style={{ width: '420px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>
              <i className="fa-solid fa-plus" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> {t('txn.add_modal_title')}
            </h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="type" checked={newTxn.type === 'out'} onChange={() => setNewTxn({ ...newTxn, type: 'out' })} />
                  <span style={{ color: 'var(--error)', fontWeight: 600 }}>{t('txn.type_expense')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="type" checked={newTxn.type === 'in'} onChange={() => setNewTxn({ ...newTxn, type: 'in' })} />
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{t('txn.type_income')}</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_date')}</label>
                <input type="date" style={{ width: '100%' }} value={newTxn.date} onChange={e => setNewTxn({ ...newTxn, date: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_desc')}</label>
                <input type="text" style={{ width: '100%' }} value={newTxn.description} onChange={e => setNewTxn({ ...newTxn, description: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_category')}</label>
                <select style={{ width: '100%' }} value={newTxn.category} onChange={e => setNewTxn({ ...newTxn, category: e.target.value })}>
                  {STANDARD_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{getCategoryName(cat)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_amount')}</label>
                <input type="number" step="1000" min="0" style={{ width: '100%' }} value={newTxn.amount} onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, marginTop: '0' }}>{t('txn.submit_add')}</button>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setAddingTxn(false)}>{t('txn.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL */}
      {editingTxn && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
          <div className="card" style={{ width: '420px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>
              <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> {t('txn.edit_modal_title')}
            </h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="edit-type" checked={editingTxn.type === 'out'} onChange={() => setEditingTxn({ ...editingTxn, type: 'out' })} />
                  <span style={{ color: 'var(--error)', fontWeight: 600 }}>{t('txn.type_expense')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="edit-type" checked={editingTxn.type === 'in'} onChange={() => setEditingTxn({ ...editingTxn, type: 'in' })} />
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{t('txn.type_income')}</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_date')}</label>
                <input type="date" style={{ width: '100%' }} value={editingTxn.date} onChange={e => setEditingTxn({ ...editingTxn, date: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_desc')}</label>
                <input type="text" style={{ width: '100%' }} value={editingTxn.description} onChange={e => setEditingTxn({ ...editingTxn, description: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_category')}</label>
                <select style={{ width: '100%' }} value={editingTxn.category} onChange={e => setEditingTxn({ ...editingTxn, category: e.target.value })} required>
                  {STANDARD_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{getCategoryName(cat)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_confidence')}</label>
                <select style={{ width: '100%' }} value={editingTxn.confidence || 'high'} onChange={e => setEditingTxn({ ...editingTxn, confidence: e.target.value })}>
                  <option value="high">{t('conf.high')}</option>
                  <option value="medium">{t('conf.medium')}</option>
                  <option value="low">{t('conf.low')}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('txn.field_amount')}</label>
                <input type="number" step="1000" min="0" style={{ width: '100%' }} value={editingTxn.amount} onChange={e => setEditingTxn({ ...editingTxn, amount: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, marginTop: '0' }}>{t('txn.save_changes')}</button>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setEditingTxn(null)}>{t('txn.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STATS STRIP */}
      <div className="summary-strip">
        <div className="summary-pill">
          <span className="summary-pill-label">{t('txn.total_txns')}</span>
          <span className="summary-pill-val">{summaryStats.count}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-pill-label" style={{ color: 'var(--success)' }}>{t('txn.total_income')}</span>
          <span className="summary-pill-val" style={{ color: 'var(--success)' }}>+{formatCurrency(summaryStats.income)}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-pill-label" style={{ color: 'var(--error)' }}>{t('txn.total_expense')}</span>
          <span className="summary-pill-val" style={{ color: 'var(--error)' }}>-{formatCurrency(summaryStats.expense)}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-pill-label">{t('txn.net_balance')}</span>
          <span className="summary-pill-val" style={{ color: summaryStats.net >= 0 ? 'var(--success)' : 'var(--error)' }}>
            {summaryStats.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summaryStats.net))}
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: '1.75rem' }}>
        {/* HEADER & TOP CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.35rem' }}>
              <i className="fa-solid fa-list-check" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> {t('txn.title')}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('txn.subtitle')}
            </span>
          </div>
          <div>
            <button className="btn-primary" onClick={() => setAddingTxn(true)}>
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> {t('txn.add_btn')}
            </button>
          </div>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="filter-toolbar">
          {/* Calendar date filter */}
          <div className="filter-item">
            <span className="filter-label">
              <i className="fa-regular fa-calendar-days"></i> {t('txn.date_picker')}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}
            />
            {selectedDate && (
              <button
                className="btn-outline"
                onClick={() => { setSelectedDate(''); setCurrentPage(1); }}
                title={t('txn.clear')}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              >
                <i className="fa-solid fa-xmark"></i> {t('txn.clear')}
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="filter-item">
            <span className="filter-label">
              <i className="fa-solid fa-tag"></i> {t('txn.category')}
            </span>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="">{t('txn.all_categories')}</option>
              {STANDARD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{getCategoryName(cat)}</option>
              ))}
            </select>
            {category && (
              <button
                className="btn-outline"
                onClick={() => { setCategory(''); setCurrentPage(1); }}
                title={t('txn.clear')}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              >
                <i className="fa-solid fa-xmark"></i> {t('txn.clear')}
              </button>
            )}
          </div>

          {/* Rows per page & Refresh */}
          <div className="filter-item" style={{ marginLeft: 'auto' }}>
            <span className="filter-label">{t('txn.show')}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value={10}>10 {t('txn.per_page')}</option>
              <option value={20}>20 {t('txn.per_page')}</option>
              <option value={50}>50 {t('txn.per_page')}</option>
            </select>
            <button
              className="btn-outline"
              onClick={refreshTransactions}
              title={t('txn.refresh')}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <i className="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>

        {/* MODERN TRANSPARENT TRANSACTION LIST */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem' }}>
            <span className="spinner"></span>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>{t('txn.loading')}</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-receipt" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.35 }}></i>
            <p style={{ margin: 0, fontWeight: 500 }}>{t('txn.no_data')}</p>
            {(selectedDate || category) && (
              <button
                className="btn-outline"
                style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                onClick={() => { setSelectedDate(''); setCategory(''); setCurrentPage(1); }}
              >
                {t('txn.clear_all')}
              </button>
            )}
          </div>
        ) : (
          <div className="txn-list-container">
            {/* Transparent Header Row */}
            <div className="txn-list-header">
              <div className="txn-header-col" onClick={() => handleSort('date')}>
                {t('txn.col_date')} {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </div>
              <div className="txn-header-col" onClick={() => handleSort('description')}>
                {t('txn.col_desc')} {sortConfig.key === 'description' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </div>
              <div className="txn-header-col" onClick={() => handleSort('category')}>
                {t('txn.col_category')} {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </div>
              <div className="txn-header-col" onClick={() => handleSort('confidence')}>
                {t('txn.col_confidence')} {sortConfig.key === 'confidence' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </div>
              <div className="txn-header-col" onClick={() => handleSort('amount')}>
                {t('txn.col_amount')} {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </div>
              <div style={{ textAlign: 'center' }}>{t('txn.col_actions')}</div>
            </div>

            {/* Floating Glassmorphic Transaction Items */}
            {currentTransactions.map((tItem) => (
              <div className="txn-row-item" key={tItem.id}>
                <div className="txn-cell-date">
                  <i className="fa-regular fa-calendar" style={{ marginRight: '6px', opacity: 0.55 }}></i>
                  {tItem.date}
                </div>

                <div className="txn-cell-desc" title={tItem.description}>
                  {tItem.description}
                </div>

                <div>
                  <span className="category-pill">
                    {getCategoryName(tItem.category)}
                  </span>
                  {debug && tItem.engine && (
                    <span style={{
                      background: tItem.engine === 'local' ? '#10b981' : '#8b5cf6',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      marginLeft: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {tItem.engine}
                    </span>
                  )}
                </div>

                <div>
                  {renderConfidenceBadge(tItem.confidence)}
                </div>

                <div
                  className="txn-cell-amount"
                  style={{ color: tItem.amount >= 0 ? 'var(--success)' : 'var(--error)' }}
                >
                  {tItem.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(tItem.amount))}
                </div>

                <div className="txn-cell-actions">
                  <button
                    className="btn-icon-action"
                    onClick={() => setEditingTxn({
                      ...tItem,
                      type: tItem.amount >= 0 ? 'in' : 'out',
                      amount: Math.abs(tItem.amount)
                    })}
                    title={t('txn.edit_modal_title')}
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button
                    className="btn-icon-action btn-icon-delete"
                    onClick={() => handleDelete(tItem.id)}
                    title={t('txn.delete_confirm')}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION BAR */}
        {sortedTransactions.length > 0 && (
          <div className="pagination-bar">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('txn.showing_range', {
                from: ((currentPage - 1) * itemsPerPage) + 1,
                to: Math.min(currentPage * itemsPerPage, sortedTransactions.length),
                total: sortedTransactions.length
              })}
            </span>
            <div className="pagination-controls">
              <button
                className="page-num-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                title={t('txn.prev')}
              >
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }}></i>
              </button>

              {renderPaginationButtons()}

              <button
                className="page-num-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                title={t('txn.next')}
              >
                <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;
