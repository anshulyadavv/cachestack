// pages/KeyExplorerPage.tsx
import React, { useState, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { ViewModal } from '../components/ViewModal';
import type { KeyEntry } from '../types';

interface KeyExplorerPageProps {
  keys: KeyEntry[];
  searchQuery?: string;   // global search from topbar
  onDelete: (id: number) => void;
  onSave: (id: number, val: string) => void;
}

const TYPE_CLASSES: Record<string, string> = {
  String: 'type-string', Hash: 'type-hash',
  List: 'type-list', Set: 'type-set', ZSet: 'type-zset',
};

export const KeyExplorerPage: React.FC<KeyExplorerPageProps> = ({
  keys, searchQuery = '', onDelete, onSave,
}) => {
  // Local search overrides global search if the user types in the in-page bar
  const [localSearch, setLocalSearch] = useState('');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [modal, setModal]             = useState<{ item: KeyEntry; mode: 'view' | 'edit' } | null>(null);

  // Use local search if set, otherwise fall back to global topbar search
  const activeSearch = localSearch || searchQuery;

  const filtered = useMemo(() => keys.filter(k => {
    const matchSearch = k.key.toLowerCase().includes(activeSearch.toLowerCase());
    const matchType   = typeFilter === 'all' || k.type.toLowerCase() === typeFilter;
    return matchSearch && matchType;
  }), [keys, activeSearch, typeFilter]);

  return (
    <div>
      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Filter keys… (e.g. user:, session:)"
              value={localSearch || searchQuery}
              onChange={e => setLocalSearch(e.target.value)}
            />
            {(localSearch || searchQuery) && (
              <span
                onClick={() => setLocalSearch('')}
                style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}
              >×</span>
            )}
          </div>
          <select
            className="filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {['String', 'Hash', 'List', 'Set', 'ZSet'].map(t => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            {filtered.length} / {keys.length} keys
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Key</th><th>Type</th><th>TTL</th><th>Size</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
                    {keys.length === 0 ? 'No keys in store yet — run SET to add one.' : 'No keys match your search.'}
                  </td>
                </tr>
              ) : filtered.map(row => (
                <tr key={row.id}>
                  <td>
                    <span className="key-name">
                      {/* Highlight matching characters */}
                      {activeSearch
                        ? highlightMatch(row.key, activeSearch)
                        : row.key}
                    </span>
                  </td>
                  <td><span className={`type-badge ${TYPE_CLASSES[row.type] ?? 'type-string'}`}>{row.type}</span></td>
                  <td><span className={`ttl-val${row.ttl === '∞' ? ' ttl-inf' : ''}`}>{row.ttl}</span></td>
                  <td><span className="size-val" style={{ color: 'var(--text2)' }}>{row.size}</span></td>
                  <td>
                    <div className="actions">
                      <button className="act-btn view" onClick={() => setModal({ item: row, mode: 'view' })}>
                        <Icon name="eye" /> View
                      </button>
                      <button className="act-btn edit" onClick={() => setModal({ item: row, mode: 'edit' })}>
                        <Icon name="pencil" /> Edit
                      </button>
                      <button className="act-btn del" onClick={() => onDelete(row.id)}>
                        <Icon name="trash" /> Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ViewModal
          item={modal.item} mode={modal.mode}
          onClose={() => setModal(null)}
          onDelete={onDelete} onSave={onSave}
        />
      )}
    </div>
  );
};

// Highlights the matching substring in yellow
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
