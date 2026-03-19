// components/Sidebar.tsx
import React from 'react';
import { Icon } from './Icon';
import type { PageId } from '../types';

const NAV_ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'keys',      label: 'Keys',      icon: 'keys'      },
  { id: 'metrics',   label: 'Metrics',   icon: 'metrics'   },
  { id: 'logs',      label: 'Logs',      icon: 'logs'      },
  { id: 'pubsub',    label: 'Pub/Sub',   icon: 'pubsub'    },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (p: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ page, onNavigate }) => (
  <div className="sidebar">
    <div className="sidebar-logo">
      <Icon name="db" />
      DATA_STORE
    </div>

    <div className="sidebar-instance">
      <div className="inst-name">DATASTORE::instance_01 · DELHI_REGION</div>
      <div className="inst-badge">Status: OK</div>
    </div>

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

    <div className="sidebar-footer">
      <span style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>v1.0.0</span>
      <span style={{ marginLeft: 'auto' }}>Delhi Region</span>
    </div>
  </div>
);
