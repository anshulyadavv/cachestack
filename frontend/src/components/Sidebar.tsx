// components/Sidebar.tsx
import React from 'react';
import { Icon } from './Icon';
import type { PageId } from '../types';
import type { RegionInfo } from '../hooks/useRegion';

const NAV_ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'keys',      label: 'Keys',      icon: 'keys'      },
  { id: 'metrics',   label: 'Metrics',   icon: 'metrics'   },
  { id: 'logs',      label: 'Logs',      icon: 'logs'      },
  { id: 'pubsub',    label: 'Pub/Sub',   icon: 'pubsub'    },
];

// ← update this to your real repo URL
const GITHUB_URL = 'https://github.com/anshulyadavv/cachestack';

interface SidebarProps {
  page: PageId;
  region: RegionInfo;
  onNavigate: (p: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ page, region, onNavigate }) => (
  <div className="sidebar">
    {/* Logo */}
    <div className="sidebar-logo">
      <Icon name="db" />
      CACHE STACK
    </div>

    {/* Instance info — uses label e.g. NEW_DELHI_REGION */}
    <div className="sidebar-instance">
      <div className="inst-name">
        CACHESTACK::instance_01 · {region.loading ? '...' : region.label}
      </div>
      <div className="inst-badge">Status: OK</div>
    </div>

    {/* Nav */}
    <nav className="sidebar-nav">
      {NAV_ITEMS.map(item => (
        <div
          key={item.id}
          className={`nav-item${page === item.id ? ' active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <Icon name={item.icon} />
          {item.label}
        </div>
      ))}
    </nav>

    {/* GitHub star */}
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '8px 12px', padding: '7px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 6, textDecoration: 'none',
        color: 'var(--text2)', fontSize: 12,
        transition: 'all 0.15s', cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border2)';
        el.style.color = 'var(--text)';
        el.style.background = 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border)';
        el.style.color = 'var(--text2)';
        el.style.background = 'rgba(255,255,255,0.03)';
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <span style={{ flex: 1 }}>Star this repo</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow)" strokeWidth="1">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    </a>

    {/* Footer — uses display e.g. "New Delhi, India" */}
    <div className="sidebar-footer" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>v1.0.0</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
          {region.loading ? '...' : (region.display || 'Local')}
        </span>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text3)', lineHeight: 1.4 }}>
        © {new Date().getFullYear()} CACHESTACK. All rights reserved.
      </div>
    </div>
  </div>
);
