// pages/PubSubPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ALL_CHANNELS } from '../api/mock';
import type { PubSubMessage } from '../types';

interface PubSubPageProps {
  messages: PubSubMessage[];
  channels: string[];
  onSubscribe: (ch: string) => void;
  onUnsubscribe: (ch: string) => void;
}

export const PubSubPage: React.FC<PubSubPageProps> = ({
  messages, channels, onSubscribe, onUnsubscribe,
}) => {
  const [inputVal, setInputVal] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSub = () => {
    const ch = inputVal.trim();
    if (ch && !channels.includes(ch)) {
      onSubscribe(ch);
      setInputVal('');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-label">Pub/Sub</div>
        <div className="live-badge">{channels.length} active</div>
      </div>

      <div className="channel-list">
        <div className="channel-input-row">
          <input
            className="channel-input"
            type="text"
            placeholder="Subscribe to channel..."
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSub()}
          />
          <button className="subscribe-btn" onClick={handleSub}>Subscribe</button>
        </div>

        <div className="channel-tags">
          {channels.map(ch => (
            <div key={ch} className="channel-tag active">
              <span className="dot" />
              {ch}
              <span className="close" onClick={() => onUnsubscribe(ch)}>×</span>
            </div>
          ))}
          {ALL_CHANNELS.filter(c => !channels.includes(c)).map(ch => (
            <div
              key={ch}
              className="channel-tag"
              style={{ cursor: 'pointer' }}
              onClick={() => onSubscribe(ch)}
            >
              {ch}
            </div>
          ))}
        </div>
      </div>

      <div className="pubsub-msgs">
        {messages.length === 0 ? (
          <div className="empty-state">Subscribe to a channel to see live messages</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="pubsub-msg">
              <div className="pubsub-msg-header">
                <span className="pubsub-channel">[{msg.channel}]</span>
                <span className="pubsub-ts">{msg.ts}</span>
              </div>
              <div className="pubsub-body">{msg.body}</div>
            </div>
          ))
        )}
        <div ref={msgEndRef} />
      </div>
    </div>
  );
};
