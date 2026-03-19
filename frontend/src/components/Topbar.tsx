// components/Topbar.tsx
import React from 'react';
import { Icon } from './Icon';

interface TopbarProps {
  title: string;
  serverOnline: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ title, serverOnline }) => (
  <div className="topbar">
    <div className="topbar-title">{title}</div>

    {/* Server status badge */}
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        fontSize: '10px', fontFamily: 'var(--mono)',
        padding: '3px 9px', borderRadius: '4px',
        background: serverOnline ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
        border: `1px solid ${serverOnline ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
        color: serverOnline ? 'var(--accent)' : 'var(--red)',
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: serverOnline ? 'var(--accent)' : 'var(--red)',
        display: 'inline-block',
        animation: serverOnline ? 'pulse 2s infinite' : 'none',
      }} />
      {serverOnline ? 'ONLINE :6399' : 'OFFLINE (mock)'}
    </div>

    <div className="topbar-search">
      <Icon name="search" style={{ color: 'var(--text3)' }} />
      <input type="text" placeholder="Search..." />
    </div>

    <div className="topbar-btn">
      <Icon name="bell" />
      <span className="notif-dot" />
    </div>

    <div className="topbar-user">
      <Icon name="user" />
      Admin
      <Icon name="chevron" />
    </div>
  </div>
);
