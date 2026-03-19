// components/ViewModal.tsx
import React, { useState, memo } from 'react';
import type { KeyEntry } from '../types';

interface ViewModalProps {
  item: KeyEntry;
  mode: 'view' | 'edit';
  onClose: () => void;
  onDelete: (id: number) => void;
  onSave: (id: number, val: string) => void;
}

export const ViewModal: React.FC<ViewModalProps> = memo(({ item, mode, onClose, onDelete, onSave }) => {
  const [val, setVal] = useState(item.value);
  const isEdit = mode === 'edit';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? `Edit — ${item.key}` : `View — ${item.key}`}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="kv-row">
            <div className="kv-label">Key</div>
            <div className="kv-val" style={{ fontFamily: 'IBM Plex Mono', color: '#60a5fa' }}>{item.key}</div>
          </div>
          <div className="kv-row">
            <div className="kv-label">Type</div>
            <div className="kv-val">{item.type}</div>
          </div>
          <div className="kv-row">
            <div className="kv-label">TTL</div>
            <div className="kv-val">{item.ttl}</div>
          </div>
          <div className="kv-row">
            <div className="kv-label">Size</div>
            <div className="kv-val">{item.size}</div>
          </div>
          <div className="kv-row" style={{ flexDirection: 'column', gap: 4 }}>
            <div className="kv-label" style={{ paddingTop: 0 }}>Value</div>
            {isEdit ? (
              <textarea
                className="kv-val editable"
                style={{ resize: 'vertical', minHeight: 100, width: '100%' }}
                value={val}
                onChange={e => setVal(e.target.value)}
              />
            ) : (
              <div className="kv-val" style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                {val}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {isEdit ? (
            <>
              <button className="btn btn-danger" onClick={() => { onDelete(item.id); onClose(); }}>Delete</button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { onSave(item.id, val); onClose(); }}>Save</button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
});
