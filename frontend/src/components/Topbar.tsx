// components/Topbar.tsx
import React from 'react';
import { Icon } from './Icon';
import { NotificationPanel } from './NotificationPanel';
import type { Notification } from '../hooks/useNotifications';

interface TopbarProps {
  title: string;
  serverOnline: boolean;
  regionDisplay: string;   // human-readable e.g. "New Delhi, India"
  searchQuery: string;
  onSearchChange: (q: string) => void;
  notifications: Notification[];
  notifOpen: boolean;
  onNotifToggle: () => void;
  onDismiss: (id: number) => void;
  onDismissAll: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title, serverOnline, regionDisplay,
  searchQuery, onSearchChange,
  notifications, notifOpen, onNotifToggle, onDismiss, onDismissAll,
}) => (
  <div className="topbar">
    <div className="topbar-title">{title}</div>

    {/* Server status badge */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontFamily: 'var(--mono)',
      padding: '3px 9px', borderRadius: 4, whiteSpace: 'nowrap',
      background: serverOnline ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
      border: `1px solid ${serverOnline ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
      color: serverOnline ? 'var(--accent)' : 'var(--red)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: serverOnline ? 'var(--accent)' : 'var(--red)',
        display: 'inline-block',
        animation: serverOnline ? 'pulse 2s infinite' : 'none',
      }} />
      {serverOnline ? 'ONLINE :6399' : 'OFFLINE (mock)'}
    </div>

    {/* Global search */}
    <div className="topbar-search" style={{ flex: 1, maxWidth: 280 }}>
      <Icon name="search" style={{ color: 'var(--text3)', flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Search keys, commands…"
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
      />
      {searchQuery && (
        <span
          onClick={() => onSearchChange('')}
          style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
        >×</span>
      )}
    </div>

    {/* Notifications */}
    <NotificationPanel
      notifications={notifications}
      unreadCount={notifications.length}
      open={notifOpen}
      onToggle={onNotifToggle}
      onDismiss={onDismiss}
      onDismissAll={onDismissAll}
    />

    {/* Admin button — always says Admin, region shown as small pill */}
    <div className="topbar-user">
      <Icon name="user" />
      Admin
      <Icon name="chevron" />
    </div>
  </div>
);
