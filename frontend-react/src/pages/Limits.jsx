import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';

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

const CATEGORY_ICONS = {
  Food: 'fa-utensils',
  Transport: 'fa-car',
  Shopping: 'fa-bag-shopping',
  Utilities: 'fa-bolt',
  Entertainment: 'fa-film',
  Health: 'fa-heart-pulse',
  Subscriptions: 'fa-repeat',
  Housing: 'fa-house',
  Transfer: 'fa-arrow-right-arrow-left',
  Other: 'fa-shapes'
};

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
  const [catInput, setCatInput] = useState('Food');
  const [amtInput, setAmtInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Dedicated Monthly Tracking state - Defaults to current month
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [availableMonths, setAvailableMonths] = useState([]);

  // Edit Modal State for dedicated pop-up adjustments
  const [editModalData, setEditModalData] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  // Helper to format YYYY-MM to Tháng MM/YYYY or MM/YYYY
  const formatMonthLabel = (mStr) => {
    if (!mStr || !mStr.includes('-')) return mStr;
    const [y, m] = mStr.split('-');
    return language === 'vi' ? `Tháng ${m}/${y}` : `${m}/${y}`;
  };

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

  // Fetch caps and spending for the selected month ONLY
  const fetchData = async (targetMonth = selectedMonth) => {
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

      if (sumRes.data.monthly_trends && Array.isArray(sumRes.data.monthly_trends)) {
        const months = sumRes.data.monthly_trends.map(item => item.month).filter(Boolean);
        if (!months.includes(currentMonthStr)) {
          months.push(currentMonthStr);
        }
        months.sort();
        setAvailableMonths(months);
      }
    } catch (err) {
      console.error('Error fetching caps or monthly summary:', err);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  // Handle save from top form (Create / Set Cap)
  const handleSaveCap = async (e) => {
    if (e) e.preventDefault();
    if (!catInput || !amtInput) return;
    const numericAmt = parseFloat(amtInput);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      alert(language === 'vi' ? 'Vui lòng nhập số tiền hạn mức hợp lệ (> 0).' : 'Please enter a valid budget amount (> 0).');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/caps', { category: catInput, amount: numericAmt });
      setAmtInput('');
      await fetchData(selectedMonth);
    } catch (err) {
      console.error('Error saving cap:', err);
      alert(language === 'vi' ? 'Lưu hạn mức thất bại.' : 'Failed to save budget cap.');
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Pop-up
  const handleOpenEditModal = (cat, limit) => {
    const spent = currentSpends[cat] || 0;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    setEditModalData({
      cat,
      limit,
      spent,
      pct,
      newAmount: String(limit),
      month: selectedMonth
    });
  };

  // Close Edit Pop-up
  const handleCloseEditModal = () => {
    setEditModalData(null);
  };

  // Handle save from Edit Pop-up
  const handleSaveEditModal = async (e) => {
    if (e) e.preventDefault();
    if (!editModalData || !editModalData.newAmount) return;
    const numericAmt = parseFloat(editModalData.newAmount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      alert(language === 'vi' ? 'Vui lòng nhập số tiền hợp lệ (> 0).' : 'Please enter a valid amount (> 0).');
      return;
    }

    setModalSaving(true);
    try {
      await apiClient.post('/caps', { category: editModalData.cat, amount: numericAmt });
      setEditModalData(null);
      await fetchData(selectedMonth);
    } catch (err) {
      console.error('Error updating cap in modal:', err);
      alert(language === 'vi' ? 'Cập nhật hạn mức thất bại.' : 'Failed to update cap.');
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

  // Calculate alerts for both exceeded (> 100%) and warning (80% - 100%) based STRICTLY on monthly spending
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

  return (
    <div>
      {/* 1. BUDGET TRACKING PERIOD HEADER BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.85rem 1.25rem',
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(59,130,246,0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            fontSize: '1.2rem'
          }}>
            <i className="fa-regular fa-calendar-check"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('limits.tracking_period_title')}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{formatMonthLabel(selectedMonth)}</span>
              {selectedMonth === currentMonthStr && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  fontWeight: 700
                }}>
                  {t('limits.current_month_badge')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Month Selector Controls: Prev, Input, Next, Reset to current */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            title={language === 'vi' ? 'Tháng trước' : 'Previous Month'}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              color: 'var(--text-main)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
            }}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>

          <input
            type="month"
            value={selectedMonth}
            onChange={e => e.target.value && setSelectedMonth(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(255,255,255,0.95)',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
            }}
          />

          <button
            type="button"
            onClick={handleNextMonth}
            title={language === 'vi' ? 'Tháng sau' : 'Next Month'}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              color: 'var(--text-main)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
            }}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>

          {selectedMonth !== currentMonthStr && (
            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonthStr)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--primary)',
                background: 'rgba(37,99,235,0.08)',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>{t('limits.jump_to_current')}</span>
            </button>
          )}
        </div>

        {/* Quick Month Pills if data exists across multiple months */}
        {availableMonths.length > 0 && (
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px dashed rgba(0,0,0,0.08)',
            flexWrap: 'wrap',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              <i className="fa-solid fa-chart-simple" style={{ marginRight: '4px', color: 'var(--primary)' }}></i>
              {t('limits.has_data_months')}
            </span>
            {availableMonths.map(m => {
              const isSelected = m === selectedMonth;
              const isCurrent = m === currentMonthStr;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  style={{
                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(0,0,0,0.08)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {formatMonthLabel(m)} {isCurrent ? (language === 'vi' ? '(Hiện tại)' : '(Now)') : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. REAL-TIME THRESHOLD ALERT BANNERS (STRICTLY MONTHLY) */}
      {/* Exceeded Alerts (> 100%) */}
      {exceededAlerts.length > 0 && (
        <div style={{
          background: 'rgba(254, 242, 242, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #fca5a5',
          borderLeft: '5px solid #dc2626',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          marginBottom: '1rem',
          color: '#991b1b',
          boxShadow: '0 4px 15px rgba(220, 38, 38, 0.08)'
        }}>
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1.6rem', color: '#dc2626', marginTop: '2px' }}></i>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '0.98rem', marginBottom: '0.25rem', color: '#991b1b' }}>
              {t('limits.alert_title')} - {formatMonthLabel(selectedMonth)} ({exceededAlerts.length} {language === 'vi' ? 'danh mục vượt trần' : 'exceeded'})
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.88rem' }}>
              {exceededAlerts.map(item => (
                <div key={item.cat}>
                  {t('limits.alert_desc', {
                    limit: formatCurrency(item.limit),
                    category: getCategoryName(item.cat),
                    spent: formatCurrency(item.spent),
                    pct: item.pct
                  })}
                  <span style={{ fontWeight: 700, marginLeft: '6px', color: '#b91c1c' }}>
                    ({t('limits.over_by', { amount: formatCurrency(item.over) })})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts (80% - 100%) */}
      {warningAlerts.length > 0 && (
        <div style={{
          background: 'rgba(254, 252, 232, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #fde047',
          borderLeft: '5px solid #eab308',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
          color: '#854d0e',
          boxShadow: '0 4px 15px rgba(234, 179, 8, 0.08)'
        }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.5rem', color: '#ca8a04', marginTop: '2px' }}></i>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '0.98rem', marginBottom: '0.25rem', color: '#854d0e' }}>
              {t('limits.warning_alert_title')} - {formatMonthLabel(selectedMonth)} ({warningAlerts.length} {language === 'vi' ? 'danh mục chạm ngưỡng ≥ 80%' : 'near limit'})
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.88rem' }}>
              {warningAlerts.map(item => (
                <div key={item.cat}>
                  {t('limits.warning_alert_desc', {
                    limit: formatCurrency(item.limit),
                    category: getCategoryName(item.cat),
                    spent: formatCurrency(item.spent),
                    pct: item.pct
                  })}
                  <span style={{ fontWeight: 700, marginLeft: '6px', color: '#a16207' }}>
                    ({t('limits.remaining', { amount: formatCurrency(item.remaining) })})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTHLY BUDGET KPI SUMMARY CARDS */}
      {Object.keys(caps).length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {/* Tile 1: Total Allocated Monthly Budget */}
          <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.45)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: 'var(--primary)', opacity: 0.12, borderRadius: '50%', filter: 'blur(20px)' }}></div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              <i className="fa-solid fa-wallet" style={{ marginRight: '0.4rem', color: 'var(--primary)' }}></i>
              {t('limits.total_budget')}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--primary)' }}>
              {formatCurrency(totalBudget)}
            </div>
          </div>

          {/* Tile 2: Total Spent in the Selected Month */}
          <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.45)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)', opacity: 0.12, borderRadius: '50%', filter: 'blur(20px)' }}></div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              <i className="fa-solid fa-receipt" style={{ marginRight: '0.4rem', color: overallPct >= 100 ? 'var(--error)' : 'var(--text-muted)' }}></i>
              {t('limits.total_spent_month', { month: formatMonthLabel(selectedMonth) })}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: overallPct >= 100 ? 'var(--error)' : 'var(--text-main)' }}>
              {formatCurrency(totalSpent)}
            </div>
          </div>

          {/* Tile 3: Remaining Budget or Overrun in Month */}
          <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.45)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: totalBudget >= totalSpent ? 'var(--success)' : 'var(--error)', opacity: 0.12, borderRadius: '50%', filter: 'blur(20px)' }}></div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              <i className="fa-solid fa-scale-balanced" style={{ marginRight: '0.4rem', color: totalBudget >= totalSpent ? 'var(--success)' : 'var(--error)' }}></i>
              {t('limits.net_remaining')}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: totalBudget >= totalSpent ? 'var(--success)' : 'var(--error)' }}>
              {totalBudget >= totalSpent ? '' : '-'}{formatCurrency(Math.abs(totalBudget - totalSpent))}
            </div>
          </div>

          {/* Tile 4: Monthly Utilization */}
          <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.45)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                <i className="fa-solid fa-gauge-high" style={{ marginRight: '0.4rem', color: overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)' }}></i>
                {t('limits.utilization')}
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                background: overallPct >= 100 ? 'rgba(220, 38, 38, 0.15)' : overallPct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)'
              }}>
                {overallPct >= 100 ? t('limits.status_exceeded') : overallPct >= 80 ? t('limits.status_warning') : t('limits.status_on_track')}
              </span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)' }}>
              {overallPct}%
            </div>
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, overallPct)}%`,
                background: overallPct >= 100 ? 'var(--error)' : overallPct >= 80 ? 'var(--warn)' : 'var(--success)',
                borderRadius: '3px',
                transition: 'width 0.8s ease'
              }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FORM THIẾT LẬP / THÊM MỚI HẠN MỨC CHO TỪNG DANH MỤC */}
      <div className="card">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }}></i>
          {t('limits.title')}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '0.4rem' }}>
          {t('limits.subtitle')}
        </p>
        
        <form onSubmit={handleSaveCap}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Category Dropdown */}
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-layer-group" style={{ marginRight: '0.4rem', color: 'var(--primary)' }}></i>
                {t('limits.cat_label')}
              </label>
              <select
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.7)' }}
                value={catInput}
                onChange={e => {
                  setCatInput(e.target.value);
                  if (caps[e.target.value]) {
                    setAmtInput(String(caps[e.target.value]));
                  }
                }}
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryName(cat)} {caps[cat] ? `(Hiện tại: ${formatCurrency(caps[cat])})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input with step="any" and min="0" to allow any round/unround values */}
            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-money-bill-wave" style={{ marginRight: '0.4rem', color: 'var(--success)' }}></i>
                {t('limits.cap_label')}
              </label>
              <input 
                type="number"
                min="0"
                step="any"
                placeholder={t('limits.cap_placeholder')} 
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }} 
                value={amtInput} 
                onChange={e => setAmtInput(e.target.value)} 
                required
              />
              {/* Formatted Currency Preview */}
              {amtInput && !isNaN(parseFloat(amtInput)) && parseFloat(amtInput) > 0 && (
                <div style={{ fontSize: '0.84rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="fa-solid fa-check-double"></i>
                  ≈ {formatCurrency(parseFloat(amtInput))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ alignSelf: 'flex-start', marginTop: '1.75rem' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !amtInput}
                style={{
                  padding: '0.75rem 1.6rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '12px',
                  fontWeight: 600
                }}
              >
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                    <span>{language === 'vi' ? 'Đang lưu...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    <span>{t('limits.save_btn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Presets Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{t('limits.quick_presets')}</span>
            {QUICK_AMOUNTS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setAmtInput(String(preset.value))}
                style={{
                  background: amtInput === String(preset.value) ? 'var(--primary)' : 'rgba(255, 255, 255, 0.65)',
                  color: amtInput === String(preset.value) ? '#ffffff' : 'var(--text-main)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                {preset.label} ({formatCurrency(preset.value)})
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* 5. ACTIVE BUDGET CAPS WITH DYNAMIC PROGRESS BARS & WARNING THRESHOLDS */}
      <div className="card">
        {/* Header with Month indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <i className="fa-solid fa-list-check" style={{ color: 'var(--primary)' }}></i>
              {t('limits.active_caps')}
            </h4>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-block', marginTop: '0.2rem' }}>
              {Object.keys(caps).length} {language === 'vi' ? 'danh mục đang áp dụng hạn mức' : 'active capped categories'} • {language === 'vi' ? `Dữ liệu chi tiêu theo ${formatMonthLabel(selectedMonth)}` : `Spending data for ${formatMonthLabel(selectedMonth)}`}
            </span>
          </div>
        </div>

        {/* Caps Table with Dynamic Progress Bars */}
        <div style={{ overflowX: 'auto' }}>
          <table className="txn-table">
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>{t('limits.col_cat')}</th>
                <th style={{ minWidth: '110px' }}>{t('limits.col_limit')}</th>
                <th style={{ minWidth: '130px' }}>{t('limits.col_spent')} ({formatMonthLabel(selectedMonth)})</th>
                <th style={{ minWidth: '240px' }}>{t('limits.col_progress')}</th>
                <th style={{ minWidth: '130px' }}>{t('limits.col_status')}</th>
                <th style={{ width: '80px', textAlign: 'center' }}>{t('limits.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(caps).length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-bell-slash" style={{ fontSize: '2rem', color: 'rgba(0,0,0,0.15)', display: 'block', marginBottom: '0.75rem' }}></i>
                    {t('limits.no_limits')}
                  </td>
                </tr>
              ) : (
                Object.entries(caps).map(([cat, limit]) => {
                  const spent = currentSpends[cat] || 0;
                  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                  const isExceeded = pct > 100;
                  const isWarning = pct >= 80 && pct <= 100;
                  const iconName = CATEGORY_ICONS[cat] || 'fa-tag';

                  // Dynamic threshold colors
                  let themeColor = '#10b981'; // Green (< 80%)
                  if (isExceeded) {
                    themeColor = '#dc2626'; // Red (> 100%)
                  } else if (isWarning) {
                    themeColor = '#f59e0b'; // Amber / Orange (80% - 100%)
                  }

                  return (
                    <tr key={cat} style={{ background: isExceeded ? 'rgba(254, 242, 242, 0.4)' : isWarning ? 'rgba(254, 252, 232, 0.4)' : 'transparent' }}>
                      {/* 1. Category */}
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isExceeded ? 'rgba(220, 38, 38, 0.1)' : isWarning ? 'rgba(245, 158, 11, 0.12)' : 'rgba(37, 99, 235, 0.08)',
                            color: themeColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem'
                          }}>
                            <i className={`fa-solid ${iconName}`}></i>
                          </span>
                          <div>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{getCategoryName(cat)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Monthly Limit */}
                      <td style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        {formatCurrency(limit)}
                      </td>

                      {/* 3. Spent in Selected Month */}
                      <td style={{ fontWeight: 700, fontSize: '0.92rem', color: isExceeded ? '#dc2626' : isWarning ? '#d97706' : 'var(--text-main)' }}>
                        {formatCurrency(spent)}
                      </td>

                      {/* 4. Progress bar with 80% indicator notch */}
                      <td>
                        <div style={{ minWidth: '190px' }}>
                          {/* Percent & Remaining / Over Text */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                            <span style={{ color: themeColor, fontWeight: 700 }}>
                              {pct}%
                            </span>
                            <span style={{ color: isExceeded ? '#dc2626' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {isExceeded 
                                ? t('limits.over_by', { amount: formatCurrency(spent - limit) })
                                : t('limits.remaining', { amount: formatCurrency(limit - spent) })
                              }
                            </span>
                          </div>

                          {/* Progress Track */}
                          <div style={{
                            height: '8px',
                            background: 'rgba(0, 0, 0, 0.07)',
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* 80% visual notch */}
                            <div style={{
                              position: 'absolute',
                              left: '80%',
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              background: 'rgba(0,0,0,0.25)',
                              zIndex: 2
                            }} title="80% Warning Threshold"></div>

                            {/* Progress Fill */}
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, pct)}%`,
                              background: themeColor,
                              borderRadius: '4px',
                              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}></div>
                          </div>
                        </div>
                      </td>

                      {/* 5. Status Badge */}
                      <td>
                        {isExceeded ? (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#b91c1c',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            {t('limits.status_exceeded')}
                          </span>
                        ) : isWarning ? (
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#b45309',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {t('limits.status_warning')}
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#047857',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <i className="fa-solid fa-circle-check"></i>
                            {t('limits.status_on_track')}
                          </span>
                        )}
                      </td>

                      {/* 6. Actions (Open dedicated Pop-up or Delete) */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat, limit)}
                            style={{
                              background: 'rgba(37, 99, 235, 0.08)',
                              border: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title={t('limits.edit_tooltip')}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCap(cat)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: 'none',
                              color: 'var(--error)',
                              cursor: 'pointer',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title={t('limits.delete_tooltip')}
                          >
                            <i className="fa-solid fa-trash"></i>
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

      {/* 6. DEDICATED POP-UP EDIT MODAL */}
      {editModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.9)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}>
                  <i className={`fa-solid ${CATEGORY_ICONS[editModalData.cat] || 'fa-tag'}`}></i>
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
                    {t('limits.edit_modal_title', { category: getCategoryName(editModalData.cat) })}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {t('limits.comparison_month', { month: formatMonthLabel(selectedMonth) })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '8px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Current Spending Info Strip */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              border: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{t('limits.current_limit')}</span>
                <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{formatCurrency(editModalData.limit)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                  {t('limits.current_spent')}
                </span>
                <strong style={{ fontSize: '0.95rem', color: editModalData.spent > editModalData.limit ? '#dc2626' : '#1e293b' }}>
                  {formatCurrency(editModalData.spent)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{t('limits.current_progress')}</span>
                <strong style={{ fontSize: '0.95rem', color: editModalData.pct > 100 ? '#dc2626' : editModalData.pct >= 80 ? '#d97706' : '#059669' }}>
                  {editModalData.pct}%
                </strong>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEditModal}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  <i className="fa-solid fa-money-bill-wave" style={{ marginRight: '0.4rem', color: 'var(--primary)' }}></i>
                  {t('limits.new_limit')}
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
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  value={editModalData.newAmount} 
                  onChange={e => setEditModalData({ ...editModalData, newAmount: e.target.value })} 
                  autoFocus
                  required
                />
                {/* Formatted Currency Preview */}
                {editModalData.newAmount && !isNaN(parseFloat(editModalData.newAmount)) && parseFloat(editModalData.newAmount) > 0 && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="fa-solid fa-check-double"></i>
                    ≈ {formatCurrency(parseFloat(editModalData.newAmount))}
                  </div>
                )}
              </div>

              {/* Quick Presets Pills in Modal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('limits.quick_presets')}</span>
                {QUICK_AMOUNTS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setEditModalData({ ...editModalData, newAmount: String(preset.value) })}
                    style={{
                      background: editModalData.newAmount === String(preset.value) ? 'var(--primary)' : '#f1f5f9',
                      color: editModalData.newAmount === String(preset.value) ? '#ffffff' : '#334155',
                      border: '1px solid #e2e8f0',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleCloseEditModal}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '10px' }}
                >
                  {t('limits.cancel_btn')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={modalSaving || !editModalData.newAmount}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontWeight: 600
                  }}
                >
                  {modalSaving ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                      <span>{language === 'vi' ? 'Đang cập nhật...' : 'Updating...'}</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk"></i>
                      <span>{t('limits.save_changes')}</span>
                    </>
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
