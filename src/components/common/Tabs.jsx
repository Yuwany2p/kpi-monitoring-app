import React, { useRef } from 'react';

/** Daftar tab dengan navigasi panah kiri/kanan (pola WAI-ARIA tabs). */
export const Tabs = ({ tabs, active, onChange, label, idPrefix = 'tab' }) => {
  const refs = useRef({});
  const onKeyDown = (e, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    const key = tabs[next].key;
    onChange(key);
    refs.current[key]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((t, i) => (
        <button
          key={t.key}
          ref={(el) => {
            refs.current[t.key] = el;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-${t.key}`}
          aria-selected={active === t.key}
          aria-controls={`${idPrefix}-panel-${t.key}`}
          tabIndex={active === t.key ? 0 : -1}
          onClick={() => onChange(t.key)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className="tab"
        >
          {t.label}
          {t.count !== undefined && t.count !== null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
};

/** Panel tetap terpasang saat disembunyikan supaya isian yang belum disimpan tidak hilang. */
export const TabPanel = ({ tabKey, active, idPrefix = 'tab', children }) => (
  <div
    role="tabpanel"
    id={`${idPrefix}-panel-${tabKey}`}
    aria-labelledby={`${idPrefix}-${tabKey}`}
    hidden={active !== tabKey}
  >
    {children}
  </div>
);
