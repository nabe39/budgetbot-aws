import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import { formatCurrency, formatShortVND } from '../utils/format';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { useUpload } from '../context/UploadContext';
import { useLanguage } from '../context/LanguageContext';
import CalendarPicker from '../components/CalendarPicker';

function Overview() {
  const [uploadMsg, setUploadMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [periodMode, setPeriodMode] = useState('all'); // 'all' | 'month' | 'year'
  const [month, setMonth] = useState('');
  const { submitUpload, refreshTrigger } = useUpload();
  const { t, getCategoryName, language } = useLanguage();

  // Helper strings for current and previous month (e.g. 2026-05)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const previousMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Set of months that have data in monthly_trends
  const availableMonthsSet = useMemo(() => {
    if (!summaryData || !summaryData.monthly_trends) return new Set();
    return new Set(summaryData.monthly_trends.map(item => item.month));
  }, [summaryData]);

  // Build all 12 months (01..12) of the target calendar year (e.g. 01/26 .. 12/26)
  const last12MonthsTrends = useMemo(() => {
    const trends = summaryData?.monthly_trends || [];
    const trendMap = new Map(trends.map(item => [item.month, item]));

    let targetYear = parseInt(currentMonthStr.slice(0, 4), 10);
    if (month && month.length >= 4) {
      const selectedY = parseInt(month.slice(0, 4), 10);
      if (!isNaN(selectedY)) targetYear = selectedY;
    } else if (trends.length > 0) {
      const latestY = parseInt(trends[trends.length - 1].month.slice(0, 4), 10);
      if (!isNaN(latestY) && latestY > targetYear) targetYear = latestY;
    }

    const result = [];
    for (let m = 1; m <= 12; m++) {
      const mKey = `${targetYear}-${String(m).padStart(2, '0')}`;
      const existing = trendMap.get(mKey);
      result.push(
        existing || { month: mKey, income: 0, expense: 0, net: 0 }
      );
    }
    return result;
  }, [summaryData, currentMonthStr, month]);

  // Fetch summary and transactions
  const fetchData = async () => {
    setLoading(true);
    try {
      const urlSuffix = month ? `?month=${month}` : '';
      const sumRes = await apiClient.get(`/summary${urlSuffix}`);
      setSummaryData(sumRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [month, refreshTrigger]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploadMsg('');
    const res = await submitUpload(file);
    if (!res || !res.success) {
      alert(res?.error || 'Upload failed');
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); };
  const handleDragLeave = (e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  // Format month for Bar Chart XAxis (e.g. 2026-05 -> 05/26)
  const formatMonthAxis = (mStr) => {
    if (!mStr || mStr.length < 7) return mStr;
    const parts = mStr.split('-');
    return `${parts[1]}/${parts[0].slice(2)}`;
  };

  // Select month from calendar popover
  const handleSelectCalendarMonth = (m) => {
    const mKey = `${calendarYear}-${String(m).padStart(2, '0')}`;
    setMonth(mKey);
    setIsCalendarOpen(false);
  };

  // Custom Bar Chart Tooltip without gray hover background
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const incVal = payload.find(p => p.dataKey === 'income')?.value || 0;
      const expVal = payload.find(p => p.dataKey === 'expense')?.value || 0;
      const netVal = incVal - expVal;

      let formattedMonth = label;
      if (label && label.length >= 7) {
        const [y, m] = label.split('-');
        formattedMonth = language === 'vi' ? `Tháng ${m}/${y}` : `${m}/${y}`;
      }

      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding: '0.85rem 1.1rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          minWidth: '185px',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-calendar-day" style={{ color: 'var(--primary)' }}></i>
            {formattedMonth}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.3rem' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{t('overview.income_bar')}:</span>
            <strong style={{ color: '#10b981' }}>+{formatCurrency(incVal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.3rem' }}>
            <span style={{ color: '#f43f5e', fontWeight: 600 }}>{t('overview.expense_bar')}:</span>
            <strong style={{ color: '#f43f5e' }}>-{formatCurrency(expVal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: netVal >= 0 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{t('txn.net_balance')}:</span>
            <strong style={{ color: netVal >= 0 ? '#10b981' : '#f43f5e' }}>
              {netVal >= 0 ? '+' : ''}{formatCurrency(netVal)}
            </strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* UPLOAD SECTION */}
      <div className="card">
        <label
          className="drop"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ display: 'block' }}
        >
          <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
          <p><strong>{t('overview.upload_title')}</strong></p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('overview.upload_sub')}</p>
          <input type="file" accept=".csv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files[0])} />
        </label>
        {uploadMsg && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534' }}>
            {uploadMsg}
          </div>
        )}
      </div>

      {/* SUMMARY SECTION */}
      <div className="card">
        {/* Header & Filter Controls (Tabs theo tháng, Tổng quan & Chọn lịch popover) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'relative',
          zIndex: 30
        }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-chart-column" style={{ color: 'var(--primary)' }}></i>
              {t('overview.spending_summary')}
            </h3>
            {month ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '0.35rem' }}>
                  <i className="fa-solid fa-calendar-check"></i>
                  {month.length === 4
                    ? (language === 'vi' ? `Đang xem: Năm ${month}` : `Viewing: ${month}`)
                    : (language === 'vi' ? `Đang xem: Tháng ${month.split('-')[1]}/${month.split('-')[0]}` : `Viewing: ${month}`)}
                </span>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '0.35rem' }}>
                    <i className="fa-solid fa-globe"></i>
                    {t('overview.all_time')}
                  </span>
            )}
                </div>

                {/* Filter Pills (Tabs) & Visual Calendar Picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Quick Tabs: Tổng quan | Tháng này | Tháng trước */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.55)',
                    padding: '3px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}>
                    <button
                      type="button"
                      onClick={() => { setPeriodMode('all'); setMonth(''); }}
                      style={{
                        background: month === '' ? '#ffffff' : 'transparent',
                        color: month === '' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '9px',
                        fontSize: '0.84rem',
                        fontWeight: month === '' ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: month === '' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <i className="fa-solid fa-layer-group" style={{ fontSize: '0.8rem' }}></i>
                      {t('overview.all_time')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPeriodMode('month'); setMonth(currentMonthStr); }}
                      style={{
                        background: month === currentMonthStr ? '#ffffff' : 'transparent',
                        color: month === currentMonthStr ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '9px',
                        fontSize: '0.84rem',
                        fontWeight: month === currentMonthStr ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: month === currentMonthStr ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      {t('overview.current_month')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPeriodMode('month'); setMonth(previousMonthStr); }}
                      style={{
                        background: month === previousMonthStr ? '#ffffff' : 'transparent',
                        color: month === previousMonthStr ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '9px',
                        fontSize: '0.84rem',
                        fontWeight: month === previousMonthStr ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: month === previousMonthStr ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      {t('overview.previous_month')}
                    </button>
                  </div>

                  <CalendarPicker
                    mode={periodMode}
                    value={month}
                    onChange={(newMode, newVal) => {
                      setPeriodMode(newMode);
                      setMonth(newVal);
                    }}
                    modes={['all', 'month', 'year']}
                    availableMonths={availableMonthsSet}
                    alignRight
                  />
                </div>
              </div>

        {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner"></span></div>
            ) : (!summaryData || !summaryData.by_category || Object.keys(summaryData.by_category).length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('overview.no_data')}</div>
            ) : (
              <>
                {/* 1. 4 SUMMARY TOTAL TILES */}
                <div className="summary-totals" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  {(() => {
                    const byCat = summaryData.by_category || {};
                    const totalIncome = summaryData.total_income ?? Object.values(byCat).filter(v => v.total > 0).reduce((s, v) => s + v.total, 0);
                    const totalExpense = summaryData.total_expense ?? Object.values(byCat).filter(v => v.total < 0).reduce((s, v) => s + Math.abs(v.total), 0);
                    const net = summaryData.net_savings ?? (totalIncome - totalExpense);
                    const savingsRate = summaryData.savings_rate ?? (totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0);

                    let savingsBadge = { text: t('savings.outstanding'), bg: 'rgba(5, 150, 105, 0.15)', color: 'var(--success)', icon: 'fa-trophy' };
                    if (savingsRate < 0) {
                      savingsBadge = { text: t('savings.deficit'), bg: 'rgba(220, 38, 38, 0.15)', color: 'var(--error)', icon: 'fa-triangle-exclamation' };
                    } else if (savingsRate < 20) {
                      savingsBadge = { text: t('savings.low'), bg: 'rgba(217, 119, 6, 0.15)', color: 'var(--warn)', icon: 'fa-circle-exclamation' };
                    } else if (savingsRate < 50) {
                      savingsBadge = { text: t('savings.healthy'), bg: 'rgba(37, 99, 235, 0.15)', color: 'var(--primary)', icon: 'fa-circle-check' };
                    }

                    return (
                      <>
                        <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: 'var(--success)', opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                          <div className="label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}><i className="fa-solid fa-money-bill-trend-up" style={{ marginRight: '0.4rem', color: 'var(--success)' }}></i>{t('overview.total_income')}</div>
                          <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--success)' }}>{formatCurrency(totalIncome)}</div>
                        </div>
                        <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: 'var(--error)', opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                          <div className="label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}><i className="fa-solid fa-money-bill-transfer" style={{ marginRight: '0.4rem', color: 'var(--error)' }}></i>{t('overview.total_expenses')}</div>
                          <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--error)' }}>{formatCurrency(totalExpense)}</div>
                        </div>
                        <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: net >= 0 ? 'var(--success)' : 'var(--error)', opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                          <div className="label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}><i className="fa-solid fa-wallet" style={{ marginRight: '0.4rem', color: net >= 0 ? 'var(--success)' : 'var(--error)' }}></i>{t('overview.net_savings')}</div>
                          <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: net >= 0 ? 'var(--success)' : 'var(--error)' }}>{net >= 0 ? '' : '-'}{formatCurrency(Math.abs(net))}</div>
                        </div>
                        <div className="total-tile" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: savingsBadge.color, opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}><i className="fa-solid fa-piggy-bank" style={{ marginRight: '0.4rem', color: savingsBadge.color }}></i>{t('overview.savings_rate')}</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: savingsBadge.bg, color: savingsBadge.color }}><i className={`fa-solid ${savingsBadge.icon}`} style={{ marginRight: '3px' }}></i>{savingsBadge.text}</span>
                          </div>
                          <div className="value" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: savingsBadge.color }}>
                            {savingsRate}%
                          </div>
                          <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, savingsRate))}%`, background: savingsBadge.color, borderRadius: '3px', transition: 'width 0.8s ease' }}></div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* TOP 3 DRIVERS HIGHLIGHT BANNER */}
                {summaryData.top_3_drivers && summaryData.top_3_drivers.length > 0 && (
                  <div style={{
                    marginBottom: '2rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.45)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '0.95rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                        <i className="fa-solid fa-fire"></i>
                      </span>
                      <span>{t('overview.top_drivers')}:</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {summaryData.top_3_drivers.map((d, i) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        return (
                          <div key={d.category} style={{
                            padding: '0.4rem 0.85rem',
                            background: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '10px',
                            border: '1px solid rgba(0,0,0,0.05)',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}>
                            <span>{medals[i] || '•'}</span>
                            <strong style={{ color: 'var(--text-main)' }}>{getCategoryName(d.category)}</strong>
                            <span style={{ color: 'var(--error)', fontWeight: 600 }}>{formatCurrency(d.total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. BIỂU ĐỒ CỘT SO SÁNH THU NHẬP VÀ CHI PHÍ 12 THÁNG GẦN NHẤT */}
                {last12MonthsTrends.length > 0 && (
                  <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fa-solid fa-chart-column" style={{ color: 'var(--primary)' }}></i>
                        {t('overview.monthly_comparison')}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {language === 'vi'
                          ? `Năm ${last12MonthsTrends[0]?.month.slice(0, 4)} (12 tháng)`
                          : `Year ${last12MonthsTrends[0]?.month.slice(0, 4)} (12 months)`}
                      </span>
                    </div>
                    <div style={{ height: '320px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={last12MonthsTrends}
                          margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 0, 0, 0.06)" />
                          <XAxis
                            dataKey="month"
                            tickFormatter={formatMonthAxis}
                            interval={0}
                            stroke="var(--text-muted)"
                            fontSize={12}
                            tickLine={false}
                          />
                          <YAxis
                            tickFormatter={formatShortVND}
                            stroke="var(--text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={false}
                            content={<CustomBarTooltip />}
                          />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '0.85rem' }}
                            formatter={(value) => (
                              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                {value === 'income' ? t('overview.income_bar') : t('overview.expense_bar')}
                              </span>
                            )}
                          />
                          <Bar
                            dataKey="income"
                            name="income"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={38}
                          />
                          <Bar
                            dataKey="expense"
                            name="expense"
                            fill="#f43f5e"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={38}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 3. BIỂU ĐỒ TRÒN PHÂN BỔ CƠ CẤU CHI TIÊU & DANH SÁCH DANH MỤC NGUYÊN BẢN */}
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>{t('overview.spending_by_category')}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 300px', height: '300px' }}>
                      {(() => {
                        const data = Object.entries(summaryData.by_category)
                          .filter(([_, v]) => v.total < 0)
                          .map(([name, v]) => ({ name: getCategoryName(name), rawName: name, value: Math.abs(v.total) }))
                          .sort((a, b) => b.value - a.value);

                        const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];

                        if (data.length === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>{t('overview.no_data')}</div>;

                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={4}
                              >
                                {data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>

                    <div style={{ flex: '1 1 340px' }}>
                      {(() => {
                        const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6'];
                        const expenseItems = summaryData.spending_allocation
                          ? summaryData.spending_allocation.filter(item => item.category !== 'Income' && item.amount > 0).sort((a, b) => b.amount - a.amount)
                          : Object.entries(summaryData.by_category || {}).filter(([_, v]) => v.total < 0).map(([cat, v]) => ({
                            category: cat,
                            amount: Math.abs(v.total),
                            percentage: summaryData.total_expense ? Math.round((Math.abs(v.total) / summaryData.total_expense) * 100) : 0
                          })).sort((a, b) => b.amount - a.amount);

                        if (expenseItems.length === 0) {
                          return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>{t('overview.no_data')}</div>;
                        }

                        return expenseItems.map((item, idx) => {
                          const color = COLORS[idx % COLORS.length];
                          return (
                            <div key={item.category} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 55px 105px', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                                {getCategoryName(item.category)}
                              </div>
                              <div style={{ height: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '5px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)', width: `${Math.min(100, item.percentage)}%`, background: color }}></div>
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: color, textAlign: 'right' }}>
                                {item.percentage}%
                              </div>
                              <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        );
}

        export default Overview;
