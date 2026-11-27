import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './CalendarPicker.css';

const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function CalendarPicker({
  mode, // 'all' | 'day' | 'month' | 'year'
  value, // '' | 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY'
  onChange, // (newMode, newValue) => void
  modes = ['all', 'day', 'month', 'year'],
  availableMonths = new Set(),
  alignRight = false,
  allowClear = true,
}) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const now = useMemo(() => new Date(), []);
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthIso = todayIso.slice(0, 7);
  const currentYearIso = String(now.getFullYear());

  // Internal browsing state inside popover
  const [viewMode, setViewMode] = useState(mode === 'all' ? (modes.includes('month') ? 'month' : modes[0]) : mode);
  const [browseYear, setBrowseYear] = useState(() => {
    const y = parseInt(String(value || '').slice(0, 4), 10);
    return !isNaN(y) ? y : now.getFullYear();
  });
  const [browseMonth, setBrowseMonth] = useState(() => {
    const parts = String(value || '').split('-');
    const m = parseInt(parts[1], 10);
    return !isNaN(m) ? m : now.getMonth() + 1;
  });
  const [decadeStart, setDecadeStart] = useState(() => Math.floor(now.getFullYear() / 12) * 12);

  useEffect(() => {
    if (mode !== 'all') setViewMode(mode);
    if (value) {
      const y = parseInt(String(value).slice(0, 4), 10);
      if (!isNaN(y)) {
        setBrowseYear(y);
        setDecadeStart(Math.floor(y / 12) * 12);
      }
      const m = parseInt(String(value).split('-')[1], 10);
      if (!isNaN(m)) setBrowseMonth(m);
    }
  }, [mode, value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const modeLabels = {
    all: language === 'vi' ? 'Tất cả' : 'All',
    day: language === 'vi' ? 'Ngày' : 'Day',
    month: language === 'vi' ? 'Tháng' : 'Month',
    year: language === 'vi' ? 'Năm' : 'Year',
  };

  const displayLabel = useMemo(() => {
    if (mode === 'all' || !value) {
      return language === 'vi' ? 'Tất cả thời gian' : 'All Time';
    }
    if (mode === 'year') {
      return language === 'vi' ? `Năm ${value}` : `Year ${value}`;
    }
    if (mode === 'month') {
      const [y, m] = value.split('-');
      return language === 'vi' ? `Tháng ${m}/${y}` : `${m}/${y}`;
    }
    if (mode === 'day') {
      const [y, m, d] = value.split('-');
      return `${d}/${m}/${y}`;
    }
    return value;
  }, [mode, value, language]);

  // Build 42-cell calendar grid for browseYear / browseMonth (Monday-first)
  const dayCells = useMemo(() => {
    const firstDay = new Date(browseYear, browseMonth - 1, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
    const daysInMonth = new Date(browseYear, browseMonth, 0).getDate();
    const prevMonthDays = new Date(browseYear, browseMonth - 1, 0).getDate();

    const cells = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pm = browseMonth === 1 ? 12 : browseMonth - 1;
      const py = browseMonth === 1 ? browseYear - 1 : browseYear;
      cells.push({
        day: d,
        iso: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        muted: true,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        iso: `${browseYear}-${String(browseMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        muted: false,
      });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = browseMonth === 12 ? 1 : browseMonth + 1;
      const ny = browseMonth === 12 ? browseYear + 1 : browseYear;
      cells.push({
        day: d,
        iso: `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        muted: true,
      });
    }
    return cells;
  }, [browseYear, browseMonth]);

  const handleModeSwitch = (m) => {
    if (m === 'all') {
      onChange('all', '');
      setIsOpen(false);
      return;
    }
    setViewMode(m);
  };

  const hasFilter = allowClear && mode !== 'all' && Boolean(value);

  return (
    <div ref={wrapperRef} className="cal-picker-wrapper">
      <button
        type="button"
        className={`cal-picker-trigger ${mode !== 'all' ? 'active' : ''} ${hasFilter ? 'has-clear' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <i className="fa-regular fa-calendar-days" style={{ color: 'var(--primary)' }}></i>
        <span>{displayLabel}</span>
        <i
          className={`fa-solid fa-chevron-down`}
          style={{
            fontSize: '0.68rem',
            opacity: 0.7,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        ></i>
      </button>

      {hasFilter && (
        <button
          type="button"
          className="cal-picker-clear"
          onClick={() => {
            onChange('all', '');
            setIsOpen(false);
          }}
          title={language === 'vi' ? 'Xóa lọc thời gian' : 'Clear period filter'}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      )}

      {isOpen && (
        <div className={`cal-picker-popover ${alignRight ? 'align-right' : ''}`}>
          {/* Mode Tabs */}
          {modes.length > 1 && (
            <div className="cal-mode-tabs">
              {modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`cal-mode-tab ${
                    (m === 'all' && mode === 'all' && !isOpen) || viewMode === m ? 'active' : ''
                  }`}
                  onClick={() => handleModeSwitch(m)}
                >
                  {modeLabels[m]}
                </button>
              ))}
            </div>
          )}

          {/* DAY GRID */}
          {viewMode === 'day' && (
            <>
              <div className="cal-header-nav">
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => {
                    if (browseMonth === 1) {
                      setBrowseMonth(12);
                      setBrowseYear((y) => y - 1);
                    } else {
                      setBrowseMonth((m) => m - 1);
                    }
                  }}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <span className="cal-header-title">
                  {language === 'vi'
                    ? `Tháng ${String(browseMonth).padStart(2, '0')} / ${browseYear}`
                    : `${MONTH_NAMES_EN[browseMonth - 1]} ${browseYear}`}
                </span>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => {
                    if (browseMonth === 12) {
                      setBrowseMonth(1);
                      setBrowseYear((y) => y + 1);
                    } else {
                      setBrowseMonth((m) => m + 1);
                    }
                  }}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div className="cal-grid-7">
                {(language === 'vi' ? WEEKDAYS_VI : WEEKDAYS_EN).map((wd) => (
                  <div key={wd} className="cal-weekday">{wd}</div>
                ))}
                {dayCells.map((cell) => {
                  const isSelected = mode === 'day' && value === cell.iso;
                  const isToday = cell.iso === todayIso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      className={`cal-cell day ${cell.muted ? 'muted' : ''} ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'current' : ''}`}
                      onClick={() => {
                        onChange('day', cell.iso);
                        setIsOpen(false);
                      }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MONTH GRID */}
          {viewMode === 'month' && (
            <>
              <div className="cal-header-nav">
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setBrowseYear((y) => y - 1)}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <span className="cal-header-title">{browseYear}</span>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setBrowseYear((y) => y + 1)}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div className="cal-grid-3">
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => {
                  const mIso = `${browseYear}-${String(m).padStart(2, '0')}`;
                  const isSelected = mode === 'month' && value === mIso;
                  const isCurrent = mIso === currentMonthIso;
                  const hasData = availableMonths.has(mIso);
                  const mName = language === 'vi' ? MONTH_NAMES_VI[m - 1] : MONTH_NAMES_EN[m - 1];
                  return (
                    <button
                      key={mIso}
                      type="button"
                      className={`cal-cell ${isSelected ? 'selected' : ''} ${isCurrent && !isSelected ? 'current' : ''} ${hasData ? 'has-data' : ''}`}
                      onClick={() => {
                        onChange('month', mIso);
                        setIsOpen(false);
                      }}
                    >
                      <span>{mName}</span>
                      {hasData && <span className="cal-data-dot"></span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* YEAR GRID */}
          {viewMode === 'year' && (
            <>
              <div className="cal-header-nav">
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setDecadeStart((y) => y - 12)}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <span className="cal-header-title">
                  {decadeStart} – {decadeStart + 11}
                </span>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setDecadeStart((y) => y + 12)}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div className="cal-grid-3">
                {Array.from({ length: 12 }, (_, idx) => String(decadeStart + idx)).map((yStr) => {
                  const isSelected = mode === 'year' && value === yStr;
                  const isCurrent = yStr === currentYearIso;
                  return (
                    <button
                      key={yStr}
                      type="button"
                      className={`cal-cell ${isSelected ? 'selected' : ''} ${isCurrent && !isSelected ? 'current' : ''}`}
                      onClick={() => {
                        onChange('year', yStr);
                        setIsOpen(false);
                      }}
                    >
                      {yStr}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer shortcuts */}
          <div className="cal-footer">
            {modes.includes('all') ? (
              <button
                type="button"
                className="cal-footer-btn secondary"
                onClick={() => {
                  onChange('all', '');
                  setIsOpen(false);
                }}
              >
                {language === 'vi' ? 'Tất cả' : 'All Time'}
              </button>
            ) : (
              <span></span>
            )}
            <button
              type="button"
              className="cal-footer-btn primary"
              onClick={() => {
                if (viewMode === 'day') {
                  onChange('day', todayIso);
                } else if (viewMode === 'year') {
                  onChange('year', currentYearIso);
                } else {
                  onChange('month', currentMonthIso);
                }
                setIsOpen(false);
              }}
            >
              {viewMode === 'day'
                ? (language === 'vi' ? 'Hôm nay' : 'Today')
                : viewMode === 'year'
                ? (language === 'vi' ? 'Năm nay' : 'This Year')
                : (language === 'vi' ? 'Tháng này' : 'This Month')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPicker;
