import { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/format';
import { useUpload } from '../context/UploadContext';
import { useLanguage } from '../context/LanguageContext';
import GlassSelect from '../components/GlassSelect';
import CalendarPicker from '../components/CalendarPicker';
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
  const [periodMode, setPeriodMode] = useState('all'); // 'all' | 'day' | 'month' | 'year'
  const [periodValue, setPeriodValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editingTxn, setEditingTxn] = useState(null);
  const [debug, setDebug] = useState(false);

  const { refreshTrigger } = useUpload();
  const { t, getCategoryName, getConfidenceLabel } = useLanguage();

  const availableMonthsSet = useMemo(() => {
    const s = new Set();
    for (const item of transactions) {
      const m = String(item.date || '').slice(0, 7);
      if (m.length === 7) s.add(m);
    }
    return s;
  }, [transactions]);

  const categoryOptions = useMemo(() => [
    { value: '', label: t('txn.all_categories'), icon: 'fa-solid fa-layer-group' },
    ...STANDARD_CATEGORIES.map(cat => ({ value: cat, label: getCategoryName(cat) }))
  ], [t, getCategoryName]);

  const modalCategoryOptions = useMemo(
    () => STANDARD_CATEGORIES.map(cat => ({ value: cat, label: getCategoryName(cat) })),
    [getCategoryName]
  );

  const pageSizeOptions = useMemo(() => [
    { value: 10, label: `10 ${t('txn.per_page')}` },
    { value: 20, label: `20 ${t('txn.per_page')}` },
    { value: 50, label: `50 ${t('txn.per_page')}` },
  ], [t]);

  const confidenceOptions = useMemo(() => [
    { value: 'high', label: t('conf.high') },
    { value: 'medium', label: t('conf.medium') },
    { value: 'low', label: t('conf.low') },
  ], [t]);

  const buildFilterParams = () => {
    const params = {};
    if (periodMode === 'day' && periodValue) {
      params.date = periodValue;
    } else if ((periodMode === 'month' || periodMode === 'year') && periodValue) {
      params.month = periodValue;
    }
    if (category) params.category = category;
    return params;
  };

  const handlePeriodChange = (mode, val) => {
    setPeriodMode(mode);
    setPeriodValue(val);
    setCurrentPage(1);
  };

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
      const res = await apiClient.get('/transactions', { params: buildFilterParams() });
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
        const res = await apiClient.get('/transactions', { params: buildFilterParams() });
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
  }, [periodMode, periodValue, category, refreshTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm(t('txn.delete_confirm'))) return;
    try {
      await apiClient.delete(`/transactions/${encodeURIComponent(id)}`);
      refreshTransactions();
    } catch (err) {
      alert(t('txn.delete_failed') + (err.response?.data?.detail || err.message));
    }
  };

  const TWO_WAY_CATEGORIES = ['Transfer', 'Other'];

  const resolveAmountByCategory = (categoryVal, directionVal, rawAmount) => {
    const absVal = Math.abs(parseFloat(rawAmount));
    if (categoryVal === 'Income') return absVal;
    if (TWO_WAY_CATEGORIES.includes(categoryVal)) {
      return directionVal === 'in' ? absVal : -absVal;
    }
    return -absVal;
  };

  const getNextTypeForCategory = (categoryVal, currentType) => {
    if (categoryVal === 'Income') return 'in';
    if (TWO_WAY_CATEGORIES.includes(categoryVal)) return currentType || 'out';
    return 'out';
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalAmount = resolveAmountByCategory(editingTxn.category, editingTxn.type, editingTxn.amount);

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
      const cat = newTxn.category || 'Food';
      const finalAmount = resolveAmountByCategory(cat, newTxn.type, newTxn.amount);

      await apiClient.post('/transactions', {
        date: newTxn.date,
        description: newTxn.description,
        amount: finalAmount,
        category: cat,
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

  const normalizeForSearch = (str) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();

  const filteredTransactions = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q) return transactions;
    return transactions.filter((item) => {
      const desc = normalizeForSearch(item.description);
      const catRaw = normalizeForSearch(item.category);
      const catLabel = normalizeForSearch(getCategoryName(item.category));
      const amtStr = String(Math.abs(Number(item.amount) || 0));
      return desc.includes(q) || catRaw.includes(q) || catLabel.includes(q) || amtStr.includes(q);
    });
  }, [transactions, searchQuery, getCategoryName]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
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
  }, [filteredTransactions, sortConfig]);

  // Quick summary stats for current view
  const summaryStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const t of filteredTransactions) {
      const amt = Number(t.amount) || 0;
      if (amt >= 0) totalIn += amt;
      else totalOut += Math.abs(amt);
    }
    return {
      count: filteredTransactions.length,
      income: totalIn,
      expense: totalOut,
      net: totalIn - totalOut
    };
  }, [filteredTransactions]);

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
        <div className="txn-modal-overlay" onClick={() => setAddingTxn(false)}>
          <div className="txn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="txn-modal-header">
              <div className="txn-modal-title-group">
                <span className="txn-modal-icon">
                  <i className="fa-solid fa-plus"></i>
                </span>
                <h3 style={{ margin: 0, fontSize: '1.18rem', color: '#0f172a' }}>{t('txn.add_modal_title')}</h3>
              </div>
              <button type="button" className="txn-modal-close" onClick={() => setAddingTxn(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="txn-field-label">{t('txn.field_date')}</label>
                  <CalendarPicker
                    mode="day"
                    value={newTxn.date}
                    onChange={(_, val) => setNewTxn({ ...newTxn, date: val })}
                    modes={['day']}
                    allowClear={false}
                  />
                </div>
                <div>
                  <label className="txn-field-label">{t('txn.field_category')}</label>
                  <GlassSelect
                    fullWidth
                    size="md"
                    alignRight
                    value={newTxn.category}
                    options={modalCategoryOptions}
                    onChange={val => setNewTxn({ ...newTxn, category: val, type: getNextTypeForCategory(val, newTxn.type) })}
                  />
                </div>
              </div>

              {TWO_WAY_CATEGORIES.includes(newTxn.category) && (
                <div className="txn-type-segmented">
                  <button
                    type="button"
                    className={`txn-type-btn ${newTxn.type === 'out' ? 'active-out' : ''}`}
                    onClick={() => setNewTxn({ ...newTxn, type: 'out' })}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>{t('txn.type_expense')}</span>
                  </button>
                  <button
                    type="button"
                    className={`txn-type-btn ${newTxn.type === 'in' ? 'active-in' : ''}`}
                    onClick={() => setNewTxn({ ...newTxn, type: 'in' })}
                  >
                    <i className="fa-solid fa-arrow-down-left"></i>
                    <span>{t('txn.type_income')}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="txn-field-label">{t('txn.field_desc')}</label>
                <input
                  type="text"
                  className="txn-modal-input"
                  placeholder="Ví dụ: Ăn trưa cơm tấm, CK mua hoa..."
                  value={newTxn.description}
                  onChange={e => setNewTxn({ ...newTxn, description: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="txn-field-label" style={{ marginBottom: 0 }}>{t('txn.field_amount')}</label>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: newTxn.type === 'in' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                    color: newTxn.type === 'in' ? 'var(--success)' : 'var(--error)'
                  }}>
                    {newTxn.type === 'in' ? t('txn.type_income') : t('txn.type_expense')}
                  </span>
                </div>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  className="txn-modal-input"
                  placeholder="Ví dụ: 50000"
                  style={{ fontWeight: 700, fontSize: '1.02rem' }}
                  value={newTxn.amount}
                  onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })}
                  required
                />
                {newTxn.amount && !isNaN(parseFloat(newTxn.amount)) && parseFloat(newTxn.amount) > 0 && (
                  <div style={{ fontSize: '0.84rem', color: newTxn.type === 'in' ? 'var(--success)' : 'var(--error)', fontWeight: 700, marginTop: '0.35rem' }}>
                    {newTxn.type === 'in' ? '+' : '-'}{formatCurrency(parseFloat(newTxn.amount))}
                  </div>
                )}
                <div className="txn-preset-row">
                  {[
                    { label: '50K', val: 50000 },
                    { label: '100K', val: 100000 },
                    { label: '200K', val: 200000 },
                    { label: '500K', val: 500000 },
                    { label: '1M', val: 1000000 },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      className={`txn-preset-chip ${String(newTxn.amount) === String(p.val) ? 'active' : ''}`}
                      onClick={() => setNewTxn({ ...newTxn, amount: String(p.val) })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="txn-modal-actions">
                <button type="button" className="btn-outline" onClick={() => setAddingTxn(false)}>{t('txn.cancel')}</button>
                <button type="submit" className="btn-primary" style={{ marginTop: 0 }}>
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                  {t('txn.submit_add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL */}
      {editingTxn && (
        <div className="txn-modal-overlay" onClick={() => setEditingTxn(null)}>
          <div className="txn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="txn-modal-header">
              <div className="txn-modal-title-group">
                <span className="txn-modal-icon">
                  <i className="fa-solid fa-pen-to-square"></i>
                </span>
                <h3 style={{ margin: 0, fontSize: '1.18rem', color: '#0f172a' }}>{t('txn.edit_modal_title')}</h3>
              </div>
              <button type="button" className="txn-modal-close" onClick={() => setEditingTxn(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="txn-field-label">{t('txn.field_date')}</label>
                  <CalendarPicker
                    mode="day"
                    value={editingTxn.date}
                    onChange={(_, val) => setEditingTxn({ ...editingTxn, date: val })}
                    modes={['day']}
                    allowClear={false}
                  />
                </div>
                <div>
                  <label className="txn-field-label">{t('txn.field_category')}</label>
                  <GlassSelect
                    fullWidth
                    size="md"
                    alignRight
                    value={editingTxn.category}
                    options={modalCategoryOptions}
                    onChange={val => setEditingTxn({ ...editingTxn, category: val, type: getNextTypeForCategory(val, editingTxn.type) })}
                  />
                </div>
              </div>

              {TWO_WAY_CATEGORIES.includes(editingTxn.category) && (
                <div className="txn-type-segmented">
                  <button
                    type="button"
                    className={`txn-type-btn ${editingTxn.type === 'out' ? 'active-out' : ''}`}
                    onClick={() => setEditingTxn({ ...editingTxn, type: 'out' })}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>{t('txn.type_expense')}</span>
                  </button>
                  <button
                    type="button"
                    className={`txn-type-btn ${editingTxn.type === 'in' ? 'active-in' : ''}`}
                    onClick={() => setEditingTxn({ ...editingTxn, type: 'in' })}
                  >
                    <i className="fa-solid fa-arrow-down-left"></i>
                    <span>{t('txn.type_income')}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="txn-field-label">{t('txn.field_desc')}</label>
                <input
                  type="text"
                  className="txn-modal-input"
                  value={editingTxn.description}
                  onChange={e => setEditingTxn({ ...editingTxn, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
                <div>
                  <label className="txn-field-label">{t('txn.field_confidence')}</label>
                  <GlassSelect
                    fullWidth
                    size="md"
                    value={editingTxn.confidence || 'high'}
                    options={confidenceOptions}
                    onChange={val => setEditingTxn({ ...editingTxn, confidence: val })}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="txn-field-label" style={{ marginBottom: 0 }}>{t('txn.field_amount')}</label>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: editingTxn.type === 'in' ? 'var(--success)' : 'var(--error)'
                    }}>
                      {editingTxn.type === 'in' ? '+' : '-'}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    className="txn-modal-input"
                    style={{ fontWeight: 700 }}
                    value={editingTxn.amount}
                    onChange={e => setEditingTxn({ ...editingTxn, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="txn-modal-actions">
                <button type="button" className="btn-outline" onClick={() => setEditingTxn(null)}>{t('txn.cancel')}</button>
                <button type="submit" className="btn-primary" style={{ marginTop: 0 }}>
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                  {t('txn.save_changes')}
                </button>
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
          {/* Row 1: Full-width Search input */}
          <div className="filter-search-box">
            <i className="fa-solid fa-magnifying-glass filter-search-icon"></i>
            <input
              type="text"
              className="filter-search-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={t('txn.search_placeholder')}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                title={t('txn.clear')}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Row 2: Calendar Period, Category & Pagination controls */}
          <div className="filter-controls-row">
            {/* Visual Calendar Period picker: All / Day / Month / Year */}
            <div className="filter-item">
              <span className="filter-label">
                <i className="fa-regular fa-calendar-days"></i> {t('txn.date_picker')}
              </span>
              <CalendarPicker
                mode={periodMode}
                value={periodValue}
                onChange={handlePeriodChange}
                modes={['all', 'day', 'month', 'year']}
                availableMonths={availableMonthsSet}
              />
            </div>

            {/* Category filter (Custom GlassSelect) */}
            <div className="filter-item">
              <span className="filter-label">
                <i className="fa-solid fa-tag"></i> {t('txn.category')}
              </span>
              <GlassSelect
                value={category}
                options={categoryOptions}
                onChange={val => { setCategory(val); setCurrentPage(1); }}
                style={{ minWidth: '185px' }}
              />
              {category && (
                <button
                  className="btn-outline"
                  onClick={() => { setCategory(''); setCurrentPage(1); }}
                  title={t('txn.clear')}
                  style={{ padding: '0.42rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Rows per page & Refresh */}
            <div className="filter-item" style={{ marginLeft: 'auto' }}>
              <span className="filter-label">{t('txn.show')}</span>
              <GlassSelect
                value={itemsPerPage}
                options={pageSizeOptions}
                onChange={val => { setItemsPerPage(Number(val)); setCurrentPage(1); }}
                alignRight
                style={{ minWidth: '125px' }}
              />
              <button
                className="btn-outline"
                onClick={refreshTransactions}
                title={t('txn.refresh')}
                style={{ padding: '0.46rem 0.78rem', fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-arrows-rotate"></i>
              </button>
            </div>
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
            {(periodMode !== 'all' || category || searchQuery) && (
              <button
                className="btn-outline"
                style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                onClick={() => { handlePeriodChange('all', ''); setCategory(''); setSearchQuery(''); setCurrentPage(1); }}
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
