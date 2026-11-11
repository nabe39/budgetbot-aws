import { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';
import './Limits.css';

const CATEGORY_OPTIONS = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Subscriptions',
  'Housing',
  'Transfer',
  'Other'
];

const QUICK_AMOUNTS = [
  { label: '1M', value: 1000000 },
  { label: '2M', value: 2000000 },
  { label: '3M', value: 3000000 },
  { label: '5M', value: 5000000 },
  { label: '10M', value: 10000000 }
];

function Limits() {
  const { t, getCategoryName, language } = useLanguage();
  const [caps, setCaps] = useState({});
  const [currentSpends, setCurrentSpends] = useState({});

  // Current month string YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Modal State for Add / Edit
  const [modalData, setModalData] = useState({
    isOpen: false,
    isEdit: false,
    category: 'Food',
    amount: ''
  });
  const [modalSaving, setModalSaving] = useState(false);

  // Helper to format YYYY-MM
  const formatMonthLabel = useCallback((mStr) => {
    if (!mStr || !mStr.includes('-')) return mStr;
    const [y, m] = mStr.split('-');
    return language === 'vi' ? `Tháng ${m}/${y}` : `${m}/${y}`;
  }, [language]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (!selectedMonth || !selectedMonth.includes('-')) return;
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (!selectedMonth || !selectedMonth.includes('-')) return;
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Fetch caps and spending for selected month
  const fetchData = useCallback(async (targetMonth = selectedMonth) => {
    try {
      const [capsRes, sumRes] = await Promise.all([
        apiClient.get('/caps'),
        apiClient.get('/summary', { params: { month: targetMonth } })
      ]);
      setCaps(capsRes.data.caps || {});
      
      const spends = {};
      if (sumRes.data.by_category) {
        Object.entries(sumRes.data.by_category).forEach(([cat, val]) => {
          if (val.total < 0) {
            spends[cat] = Math.abs(val.total);
          }
        });
      }
      setCurrentSpends(spends);
    } catch (err) {
      console.error('Error fetching caps or monthly summary:', err);
    }
  }, [selectedMonth]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [capsRes, sumRes] = await Promise.all([
          apiClient.get('/caps'),
          apiClient.get('/summary', { params: { month: selectedMonth } })
        ]);
        if (!isActive) return;
        setCaps(capsRes.data.caps || {});
        
        const spends = {};
        if (sumRes.data.by_category) {
          Object.entries(sumRes.data.by_category).forEach(([cat, val]) => {
            if (val.total < 0) {
              spends[cat] = Math.abs(val.total);
            }
          });
        }
        setCurrentSpends(spends);
      } catch (err) {
        console.error('Error fetching caps or monthly summary:', err);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [selectedMonth]);

  // Open modal to add or set new cap
  const handleOpenAddModal = (initialCat = null) => {
    const defaultCat = initialCat || CATEGORY_OPTIONS.find(c => !caps[c]) || 'Food';
    setModalData({
      isOpen: true,
      isEdit: Boolean(caps[defaultCat]),
      category: defaultCat,
      amount: caps[defaultCat] ? String(caps[defaultCat]) : ''
    });
  };

  // Open modal to edit existing cap
  const handleOpenEditModal = (cat, limit) => {
    setModalData({
      isOpen: true,
      isEdit: true,
      category: cat,
      amount: String(limit)
    });
  };

  const handleCloseModal = () => {
    setModalData(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveModal = async (e) => {
    if (e) e.preventDefault();
    if (!modalData.category || !modalData.amount) return;
    const numericAmt = parseFloat(modalData.amount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      alert(language === 'vi' ? 'Vui lòng nhập số tiền hạn mức hợp lệ (> 0).' : 'Please enter a valid budget amount (> 0).');
      return;
    }

    setModalSaving(true);
    try {
      await apiClient.post('/caps', { category: modalData.category, amount: numericAmt });
      handleCloseModal();
      await fetchData(selectedMonth);
    } catch (err) {
      console.error('Error saving cap:', err);
      alert(language === 'vi' ? 'Lưu hạn mức thất bại.' : 'Failed to save budget cap.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteCap = async (cat) => {
    if (!window.confirm(t('limits.confirm_delete', { category: getCategoryName(cat) }))) return;
    try {
      await apiClient.delete(`/caps/${cat}`);
      await fetchData(selectedMonth);
    } catch (err) {
      console.error('Error deleting cap:', err);
      window.alert(t('limits.delete_failed'));
    }
  };

  // Calculations for thresholds and totals
  const { exceededAlerts, warningAlerts, totalBudget, totalSpent, overallPct } = useMemo(() => {
    const exceeded = [];
    const warning = [];
    let tBudget = 0;
    let tSpent = 0;

    Object.entries(caps).forEach(([cat, limit]) => {
      const spent = currentSpends[cat] || 0;
      tBudget += limit;
      tSpent += spent;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      if (pct > 100) {
        exceeded.push({ cat, limit, spent, pct, over: spent - limit });
      } else if (pct >= 80) {
        warning.push({ cat, limit, spent, pct, remaining: limit - spent });
      }
    });

    const oPct = tBudget > 0 ? Math.round((tSpent / tBudget) * 100) : 0;

    return {
      exceededAlerts: exceeded,
      warningAlerts: warning,
      totalBudget: tBudget,
      totalSpent: tSpent,
      overallPct: oPct
    };
  }, [caps, currentSpends]);

  const activeCapsCount = Object.keys(caps).length;

  return (
    <div className="limits-container">
      {/* 1. TOP SUMMARY KPI STRIP */}
      <div className="limits-summary-strip">
        <div className="limits-summary-pill">
          <span className="limits-summary-label">
            {t('limits.total_budget')}
          </span>
          <span className="limits-summary-val" style={{ color: 'var(--primary)' }}>
            {formatCurrency(totalBudget)}
          </span>
        </div>

        <div className="limits-summary-pill">
          <span className="limits-summary-label">
            {t('limits.total_spent')}
          </span>
          <span className="limits-summary-val" style={{ color: overallPct > 100 ? 'var(--error)' : 'var(--text-main)' }}>
            {formatCurrency(totalSpent)}
          </span>
        </div>

        <div className="limits-summary-pill">
          <span className="limits-summary-label">
            {t('limits.net_remaining')}
          </span>
          <span className="limits-summary-val" style={{ color: totalBudget >= totalSpent ? 'var(--success)' : 'var(--error)' }}>
            {totalBudget >= totalSpent ? '' : '-'}{formatCurrency(Math.abs(totalBudget - totalSpent))}
          </span>
        </div>

        <div className="limits-summary-pill">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="limits-summary-label">
              {t('limits.utilization')}
            </span>
            <span className={`limits-status-pill ${overallPct > 100 ? 'exceeded' : overallPct >= 80 ? 'warning' : 'safe'}`}>
              {overallPct > 100 ? t('limits.status_exceeded') : overallPct >= 80 ? t('limits.status_warning') : t('limits.status_on_track')}
            </span>
          </div>
          <span className="limits-summary-val" style={{ color: overallPct > 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)' }}>
            {overallPct}%
          </span>
          <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, overallPct)}%`,
              background: overallPct > 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)',
              borderRadius: '3px',
              transition: 'width 0.6s ease'
            }}></div>
          </div>
        </div>
      </div>

      {/* 2. MAIN UNIFIED CARD */}
      <div className="limits-main-card">
        {/* Header Bar */}
        <div className="limits-header">
          <div className="limits-title-group">
            <h3>
              {t('limits.title')}
            </h3>
            <span className="limits-title-desc">
              {activeCapsCount} {language === 'vi' ? 'danh mục áp dụng hạn mức' : 'active category limits'} • {formatMonthLabel(selectedMonth)}
            </span>
          </div>

          <div className="limits-controls">
            {/* Month Navigator */}
            <div className="limits-month-selector">
              <button
                type="button"
                onClick={handlePrevMonth}
                title={language === 'vi' ? 'Tháng trước' : 'Previous Month'}
                className="limits-month-nav-btn"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => e.target.value && setSelectedMonth(e.target.value)}
                onClick={e => e.target.showPicker && e.target.showPicker()}
                className="limits-month-input"
              />
              <button
                type="button"
                onClick={handleNextMonth}
                title={language === 'vi' ? 'Tháng sau' : 'Next Month'}
                className="limits-month-nav-btn"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {selectedMonth !== currentMonthStr && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="btn-outline limits-reset-btn"
                title={t('limits.jump_to_current')}
              >
                {t('limits.jump_to_current')}
              </button>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              className="btn-primary limits-save-btn"
              onClick={() => handleOpenAddModal()}
            >
              + {t('limits.save_btn')}
            </button>
          </div>
        </div>

        {/* Real-time Alert Banners (if any) */}
        {(exceededAlerts.length > 0 || warningAlerts.length > 0) && (
          <div className="limits-alerts-container">
            {exceededAlerts.length > 0 && (
              <div className="limits-alert-pill exceeded">
                <div style={{ flex: 1 }}>
                  <strong>{language === 'vi' ? 'Vượt hạn mức:' : 'Budget Exceeded:'} </strong>
                  {exceededAlerts.map((i, idx) => (
                    <span key={i.cat}>
                      {idx > 0 && ' • '}
                      <strong>{getCategoryName(i.cat)}</strong>: đã chi {formatCurrency(i.spent)} / {formatCurrency(i.limit)}
                      <span style={{ color: '#b91c1c', fontWeight: 700 }}> (+{formatCurrency(i.over)})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {warningAlerts.length > 0 && (
              <div className="limits-alert-pill warning">
                <div style={{ flex: 1 }}>
                  <strong>{language === 'vi' ? 'Cảnh báo chạm ngưỡng (≥ 80%):' : 'Approaching Limit (≥ 80%):'} </strong>
                  {warningAlerts.map((i, idx) => (
                    <span key={i.cat}>
                      {idx > 0 && ' • '}
                      <strong>{getCategoryName(i.cat)}</strong>: đã chi {formatCurrency(i.spent)} / {formatCurrency(i.limit)} ({i.pct}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Minimalist Table of Active Caps */}
        <div className="limits-table-wrapper">
          <table className="limits-table">
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>{t('limits.col_cat')}</th>
                <th style={{ minWidth: '110px' }}>{t('limits.col_limit')}</th>
                <th style={{ minWidth: '120px' }}>{t('limits.col_spent')}</th>
                <th style={{ minWidth: '220px' }}>{t('limits.col_progress')}</th>
                <th style={{ minWidth: '120px' }}>{t('limits.col_status')}</th>
                <th style={{ width: '80px', textAlign: 'center' }}>{t('limits.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {activeCapsCount === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>{t('limits.no_limits')}</p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenAddModal()}
                      style={{ marginTop: '1rem', padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
                    >
                      + {t('limits.save_btn')}
                    </button>
                  </td>
                </tr>
              ) : (
                Object.entries(caps).map(([cat, limit]) => {
                  const spent = currentSpends[cat] || 0;
                  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                  const isExceeded = pct > 100;
                  const isWarning = pct >= 80 && pct <= 100;

                  let themeColor = '#10b981'; // Green (< 80%)
                  if (isExceeded) themeColor = '#dc2626';
                  else if (isWarning) themeColor = '#f59e0b';

                  return (
                    <tr key={cat} style={{ background: isExceeded ? 'rgba(254, 242, 242, 0.4)' : isWarning ? 'rgba(254, 252, 232, 0.4)' : 'transparent' }}>
                      {/* Category */}
                      <td>
                        <div className="limits-cat-cell">
                          <div>
                            <div className="limits-cat-name">{getCategoryName(cat)}</div>
                            <div className="limits-cat-sub">{cat}</div>
                          </div>
                        </div>
                      </td>

                      {/* Limit */}
                      <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatCurrency(limit)}
                      </td>

                      {/* Spent */}
                      <td style={{ fontWeight: 700, fontSize: '0.95rem', color: isExceeded ? '#dc2626' : isWarning ? '#d97706' : 'var(--text-main)' }}>
                        {formatCurrency(spent)}
                      </td>

                      {/* Progress Bar & Threshold */}
                      <td>
                        <div className="limits-progress-box">
                          <div className="limits-progress-meta">
                            <span style={{ color: themeColor, fontWeight: 700 }}>{pct}%</span>
                            <span style={{ color: isExceeded ? '#dc2626' : 'var(--text-muted)', fontSize: '0.74rem' }}>
                              {isExceeded 
                                ? t('limits.over_by', { amount: formatCurrency(spent - limit) })
                                : t('limits.remaining', { amount: formatCurrency(limit - spent) })
                              }
                            </span>
                          </div>
                          <div className="limits-progress-bar">
                            <div className="limits-progress-notch" title="80% Warning Threshold"></div>
                            <div
                              className="limits-progress-fill"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                background: themeColor
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`limits-status-pill ${isExceeded ? 'exceeded' : isWarning ? 'warning' : 'safe'}`}>
                          {isExceeded ? t('limits.status_exceeded') : isWarning ? t('limits.status_warning') : t('limits.status_on_track')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat, limit)}
                            className="limits-action-btn edit"
                            title={t('limits.edit_tooltip')}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCap(cat)}
                            className="limits-action-btn delete"
                            title={t('limits.delete_tooltip')}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL FOR SETTING / EDITING BUDGET LIMIT */}
      {modalData.isOpen && (
        <div className="limits-modal-overlay">
          <div className="limits-modal-card">
            {/* Modal Header */}
            <div className="limits-modal-header">
              <h3 className="limits-modal-title">
                {modalData.isEdit 
                  ? t('limits.edit_modal_title', { category: getCategoryName(modalData.category) })
                  : t('limits.save_btn')
                }
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.15rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              {/* Category Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.45rem', color: '#1e293b' }}>
                  {t('limits.cat_label')}
                </label>
                <select
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                  value={modalData.category}
                  disabled={modalData.isEdit}
                  onChange={e => {
                    const newCat = e.target.value;
                    setModalData(prev => ({
                      ...prev,
                      category: newCat,
                      isEdit: Boolean(caps[newCat]),
                      amount: caps[newCat] ? String(caps[newCat]) : prev.amount
                    }));
                  }}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>
                      {getCategoryName(cat)} {caps[cat] ? `(${formatCurrency(caps[cat])})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Amount Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.45rem', color: '#1e293b' }}>
                  {t('limits.cap_label')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={t('limits.cap_placeholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                  value={modalData.amount}
                  onChange={e => setModalData(prev => ({ ...prev, amount: e.target.value }))}
                  autoFocus
                  required
                />
                {modalData.amount && !isNaN(parseFloat(modalData.amount)) && parseFloat(modalData.amount) > 0 && (
                  <div style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.4rem' }}>
                    ≈ {formatCurrency(parseFloat(modalData.amount))}
                  </div>
                )}
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{t('limits.quick_presets')}</span>
                {QUICK_AMOUNTS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`limits-preset-btn ${modalData.amount === String(preset.value) ? 'active' : ''}`}
                    onClick={() => setModalData(prev => ({ ...prev, amount: String(preset.value) }))}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Current Month Spending Context in Modal */}
              {currentSpends[modalData.category] !== undefined && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ color: '#64748b' }}>
                    {language === 'vi' ? `Chi tiêu trong ${formatMonthLabel(selectedMonth)}:` : `Spent in ${formatMonthLabel(selectedMonth)}:`}
                  </span>
                  <strong style={{ color: '#1e293b' }}>
                    {formatCurrency(currentSpends[modalData.category])}
                  </strong>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleCloseModal}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '10px' }}
                >
                  {t('limits.cancel_btn')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={modalSaving || !modalData.amount}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {modalSaving ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                      <span>{language === 'vi' ? 'Đang lưu...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{modalData.isEdit ? t('limits.save_changes') : t('limits.save_btn')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Limits;
