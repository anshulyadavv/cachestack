// components/ToastStrip.tsx
// Floating toast banners that appear bottom-right for transient alerts.
import React from 'react';
import type { Notification, NotifLevel } from '../hooks/useNotifications';

interface Props {
  toasts: Notification[];
  onDismiss: (id: number) => void;
}

const COLORS: Record<NotifLevel, string> = {
  info:    'var(--blue)',
  success: 'var(--accent)',
  warning: 'var(--yellow)',
  error:   'var(--red)',
};

export const ToastStrip: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 999, maxWidth: 340,
    }}>
      {toasts.slice(0, 4).map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg1)',
          border: `1px solid ${COLORS[t.level]}44`,
          borderLeft: `3px solid ${COLORS[t.level]}`,
          borderRadius: 6, padding: '10px 12px',
          animation: 'slideUp 0.2s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{t.message}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{t.ts}</div>
          </div>
          <span
            onClick={() => onDismiss(t.id)}
            style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >×</span>
        </div>
      ))}
    </div>
  );
};
