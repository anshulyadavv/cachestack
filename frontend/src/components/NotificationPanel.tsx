// components/NotificationPanel.tsx
// Dropdown notification panel + toast strip at the bottom of the topbar bell.
import React from 'react';
import type { Notification, NotifLevel } from '../hooks/useNotifications';

interface Props {
  notifications: Notification[];
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
  onDismiss: (id: number) => void;
  onDismissAll: () => void;
}

const LEVEL_STYLE: Record<NotifLevel, { color: string; bg: string; border: string; icon: string }> = {
  info:    { color: 'var(--blue)',   bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)',   icon: 'ℹ' },
  success: { color: 'var(--accent)', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.2)',   icon: '✓' },
  warning: { color: 'var(--yellow)', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.2)',   icon: '⚠' },
  error:   { color: 'var(--red)',    bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.2)',  icon: '✕' },
};

export const NotificationPanel: React.FC<Props> = ({
  notifications, unreadCount, open, onToggle, onDismiss, onDismissAll,
}) => (
  <div style={{ position: 'relative' }}>
    {/* Bell button */}
    <div
      className="topbar-btn"
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
      title="Notifications"
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: 5, right: 5,
          width: 7, height: 7, borderRadius: '50%',
          background: unreadCount > 0 && notifications[0]?.level === 'error' ? 'var(--red)' : 'var(--yellow)',
          border: '1px solid var(--bg1)',
          fontSize: 0,
        }} />
      )}
    </div>

    {/* Dropdown panel */}
    {open && (
      <div style={{
        position: 'absolute', top: 38, right: 0,
        width: 320, maxHeight: 400,
        background: 'var(--bg1)',
        border: '1px solid var(--border2)',
        borderRadius: 8,
        zIndex: 200,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </span>
          {notifications.length > 0 && (
            <span
              onClick={onDismissAll}
              style={{ fontSize: 10, color: 'var(--text3)', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, border: '1px solid var(--border)' }}
            >
              Clear all
            </span>
          )}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              No notifications
            </div>
          ) : notifications.map(n => {
            const s = LEVEL_STYLE[n.level];
            return (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', borderBottom: '1px solid var(--border)',
                background: s.bg,
              }}>
                <span style={{
                  fontSize: 12, color: s.color, marginTop: 1,
                  minWidth: 14, textAlign: 'center',
                }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--mono)' }}>{n.ts}</div>
                </div>
                <span
                  onClick={() => onDismiss(n.id)}
                  style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                >×</span>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
