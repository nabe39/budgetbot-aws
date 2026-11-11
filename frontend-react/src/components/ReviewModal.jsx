import React, { useState, useMemo } from 'react';
import { useUpload } from '../context/UploadContext';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './ReviewModal.css';

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

function ReviewModal() {
  const { reviewTransactions, setReviewTransactions, triggerRefresh } = useUpload();
  const { t, getCategoryName, getConfidenceLabel } = useLanguage();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'attention' | 'high'
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // All Hooks MUST be at the top level before any conditional return
  // Counts and filters
  const attentionCount = useMemo(() => {
    if (!Array.isArray(reviewTransactions)) return 0;
    return reviewTransactions.filter(t => (t.confidence || '').toLowerCase() !== 'high').length;
  }, [reviewTransactions]);

  const highCount = useMemo(() => {
    if (!Array.isArray(reviewTransactions)) return 0;
    return reviewTransactions.filter(t => (t.confidence || '').toLowerCase() === 'high').length;
  }, [reviewTransactions]);

  // Financial summary
  const summary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    if (Array.isArray(reviewTransactions)) {
      for (const t of reviewTransactions) {
        const amt = Number(t.amount) || 0;
        if (t.category === 'Income' || amt > 0) {
          inc += Math.abs(amt);
        } else {
          exp += Math.abs(amt);
        }
      }
    }
    return {
      income: inc,
      expense: exp,
      net: inc - exp
    };
  }, [reviewTransactions]);

  // Filtered view
  const visibleTransactions = useMemo(() => {
    if (!Array.isArray(reviewTransactions)) return [];
    return reviewTransactions.map((item, originalIndex) => ({ ...item, originalIndex })).filter(t => {
      const conf = (t.confidence || '').toLowerCase();
      if (activeTab === 'attention') return conf !== 'high';
      if (activeTab === 'high') return conf === 'high';
      return true;
    });
  }, [reviewTransactions, activeTab]);

  const handleReviewCategoryChange = (originalIndex, newCat) => {
    setReviewTransactions(prev => {
      const updated = [...prev];
      const item = { ...updated[originalIndex], category: newCat };
      
      // Auto-adjust amount sign: Income is positive, standard expense is negative
      if (newCat === 'Income') {
        item.amount = Math.abs(item.amount);
      } else if (['Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Subscriptions'].includes(newCat)) {
        item.amount = -Math.abs(item.amount);
      }
      
      updated[originalIndex] = item;
      return updated;
    });
  };

  const handleRemoveRow = (originalIndex) => {
    setReviewTransactions(prev => prev.filter((_, i) => i !== originalIndex));
  };

  const handleReviewSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      // Clean each transaction payload: normalize sign, mark verified confidence
      const cleanTxns = reviewTransactions.map(({ jobId, ...rest }) => {
        let amt = Number(rest.amount);
        if (rest.category === 'Income') {
          amt = Math.abs(amt);
        } else if (['Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Subscriptions'].includes(rest.category)) {
          amt = -Math.abs(amt);
        }

        return {
          date: rest.date,
          description: rest.description,
          amount: amt,
          category: rest.category || 'Other',
          confidence: 'high', // Once human reviewed and confirmed, confidence is verified high
          engine: 'user_confirmed',
        };
      });

      await apiClient.post('/transactions/batch', { transactions: cleanTxns });
      setReviewTransactions([]);
      
      if (typeof triggerRefresh === 'function') {
        triggerRefresh();
      }
      navigate('/transactions', { replace: true });
    } catch (err) {
      setErrorMsg(t('review.batch_failed') + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const renderConfidenceBadge = (confidence) => {
    const conf = (confidence || 'low').toLowerCase();
    const label = getConfidenceLabel(confidence || 'low');
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
    return (
      <span className="badge-confidence badge-confidence-low">
        <i className="fa-solid fa-circle-exclamation"></i> {label}
      </span>
    );
  };

  // Safe early exit AFTER all hooks are called
  if (!reviewTransactions || reviewTransactions.length === 0) return null;

  return (
    <div className="review-modal-overlay">
      <div className="review-modal-card">
        {/* Header */}
        <div className="review-modal-header">
          <div className="review-title-group">
            <div className="review-title-icon">
              <i className="fa-solid fa-file-invoice-dollar"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3>{t('review.title')}</h3>
                <span className="review-count-pill">
                  {reviewTransactions.length}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {t('review.desc', { count: reviewTransactions.length })}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="review-close-btn"
            onClick={() => setReviewTransactions([])}
            disabled={saving}
            title={t('review.cancel')}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="review-modal-body">
          {/* Informative Staging Review notice */}
          <div className="review-notice-banner">
            <i className="fa-solid fa-circle-info"></i>
            <div>
              <strong>{t('review.badge_notice')}:</strong> {t('review.explanation')}
            </div>
          </div>

          {/* Quick Financial Summary Strip */}
          <div className="review-summary-strip">
            <div className="review-summary-item">
              <span className="review-summary-label">{t('review.summary_est_income')}</span>
              <span className="review-summary-val income">+{formatCurrency(summary.income)}</span>
            </div>
            <div className="review-summary-item">
              <span className="review-summary-label">{t('review.summary_est_expense')}</span>
              <span className="review-summary-val expense">-{formatCurrency(summary.expense)}</span>
            </div>
            <div className="review-summary-item">
              <span className="review-summary-label">{t('txn.net_balance')}</span>
              <span className={`review-summary-val ${summary.net >= 0 ? 'income' : 'expense'}`}>
                {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="review-filter-tabs">
            <button
              type="button"
              className={`review-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <i className="fa-solid fa-list-ul"></i>
              {t('review.tab_all', { count: reviewTransactions.length })}
            </button>
            <button
              type="button"
              className={`review-tab-btn ${activeTab === 'attention' ? 'active' : ''}`}
              onClick={() => setActiveTab('attention')}
            >
              <i className="fa-solid fa-triangle-exclamation" style={{ color: activeTab === 'attention' ? '#fff' : '#f59e0b' }}></i>
              {t('review.tab_attention', { count: attentionCount })}
            </button>
            <button
              type="button"
              className={`review-tab-btn ${activeTab === 'high' ? 'active' : ''}`}
              onClick={() => setActiveTab('high')}
            >
              <i className="fa-solid fa-circle-check" style={{ color: activeTab === 'high' ? '#fff' : '#10b981' }}></i>
              {t('review.tab_high', { count: highCount })}
            </button>
          </div>

          {errorMsg && (
            <div className="review-error-banner">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* List header */}
          <div className="review-list-header">
            <div>{t('review.col_info')}</div>
            <div>{t('review.col_amount')}</div>
            <div>{t('review.col_confidence')}</div>
            <div>{t('review.col_category')}</div>
            <div style={{ textAlign: 'center' }}>{t('review.col_action')}</div>
          </div>

          {/* Transaction list */}
          {visibleTransactions.length === 0 ? (
            <div className="review-empty-state">
              <i className="fa-regular fa-folder-open"></i>
              <span>{t('review.empty_filter')}</span>
            </div>
          ) : (
            <div className="review-list">
              {visibleTransactions.map((txn) => {
                const isPositive = txn.category === 'Income' || txn.amount >= 0;
                return (
                  <div key={txn.originalIndex} className="review-item-row">
                    {/* Info: Description & Date */}
                    <div className="review-item-info">
                      <span className="review-item-desc" title={txn.description}>
                        {txn.description}
                      </span>
                      <span className="review-item-date">
                        <i className="fa-regular fa-calendar" style={{ fontSize: '0.75rem' }}></i>
                        {txn.date}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className={`review-item-amount ${isPositive ? 'positive' : 'negative'}`}>
                      {isPositive ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                    </div>

                    {/* Confidence Badge */}
                    <div className="review-item-confidence">
                      {renderConfidenceBadge(txn.confidence)}
                    </div>

                    {/* Category Dropdown (10 standard categories) */}
                    <div>
                      <select
                        className="review-category-select"
                        value={txn.category || 'Other'}
                        onChange={(e) => handleReviewCategoryChange(txn.originalIndex, e.target.value)}
                        disabled={saving}
                      >
                        {STANDARD_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>
                            {getCategoryName(cat)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Delete/Skip item action */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="review-btn-delete"
                        onClick={() => handleRemoveRow(txn.originalIndex)}
                        disabled={saving}
                        title={t('review.delete_item_tooltip')}
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="review-modal-footer">
          <div className="review-footer-status">
            <i className="fa-solid fa-list-check" style={{ color: 'var(--primary, #3b82f6)' }}></i>
            <span>
              {t('review.ready_count', { count: reviewTransactions.length })}
            </span>
          </div>

          <div className="review-footer-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setReviewTransactions([])}
              style={{ borderColor: '#cbd5e1', color: '#64748b' }}
              disabled={saving}
            >
              {t('review.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 0 }}
              onClick={handleReviewSave}
              disabled={saving || reviewTransactions.length === 0}
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ width: '14px', height: '14px', marginRight: '6px' }}></span>
                  {t('review.saving')}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: '6px' }}></i>
                  {t('review.confirm')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;
