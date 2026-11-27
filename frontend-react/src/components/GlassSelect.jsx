import React, { useState, useRef, useEffect } from 'react';
import './GlassSelect.css';

function GlassSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  fullWidth = false,
  alignRight = false,
  size = 'sm',
  icon = null,
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
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

  return (
    <div
      ref={containerRef}
      className={`glass-select-wrapper ${fullWidth ? 'full-width' : ''}`}
      style={style}
    >
      <button
        type="button"
        disabled={disabled}
        className={`glass-select-trigger ${size} ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
      >
        <span className="glass-select-value">
          {(selectedOption?.icon || icon) && (
            <i
              className={selectedOption?.icon || icon}
              style={{ color: 'var(--primary)', fontSize: '0.85em', opacity: 0.9 }}
            ></i>
          )}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <i className="fa-solid fa-chevron-down glass-select-chevron"></i>
      </button>

      {isOpen && (
        <div className={`glass-select-menu ${alignRight ? 'align-right' : ''}`}>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`glass-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="glass-select-option-left">
                  {opt.icon && (
                    <i
                      className={opt.icon}
                      style={{
                        width: '16px',
                        textAlign: 'center',
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                    ></i>
                  )}
                  <span>{opt.label}</span>
                </span>
                {isSelected && <i className="fa-solid fa-check glass-select-check"></i>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GlassSelect;
