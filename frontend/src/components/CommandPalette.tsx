// components/CommandPalette.tsx
import React from 'react';

interface CommandPaletteProps {
  value: string;
  result: string;
  serverOnline: boolean;
  onChange: (v: string) => void;
  onExec: () => void;
}

const QUICK_CMDS = ['PING', 'DBSIZE', 'KEYS', 'INFO'];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  value, result, serverOnline, onChange, onExec,
}) => (
  <div style={{ marginTop: 16 }}>
    <div className="section-title">Command Palette</div>
    <div className="card">
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <input
          className="channel-input"
          style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
          placeholder={
            serverOnline
              ? 'Type a command e.g. SET foo bar | GET foo | DBSIZE'
              : "Server offline — commands won't be sent"
          }
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onExec()}
        />
        <button className="subscribe-btn" onClick={onExec}>Execute</button>
      </div>

      {result && (
        <div style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text3)', marginRight: 8 }}>→</span>
          {result}
        </div>
      )}

      <div style={{ padding: '6px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_CMDS.map(q => (
          <span
            key={q}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)',
              cursor: 'pointer', padding: '2px 6px',
              background: 'var(--bg2)', borderRadius: 3, border: '1px solid var(--border)',
            }}
            onClick={() => onChange(q)}
          >
            {q}
          </span>
        ))}
      </div>
    </div>
  </div>
);
