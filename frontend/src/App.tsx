// App.tsx — root component
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CommandPalette } from './components/CommandPalette';
import { ToastStrip } from './components/ToastStrip';
import { DashboardPage } from './pages/DashboardPage';
import { KeyExplorerPage } from './pages/KeyExplorerPage';
import { MetricsPage } from './pages/MetricsPage';
import { LogsPage } from './pages/LogsPage';
import { PubSubPage } from './pages/PubSubPage';
import { api } from './api/client';
import { INITIAL_KEYS, genLogEntry, genPubSubMsg, seedLogEntries } from './api/mock';
import { useRegion } from './hooks/useRegion';
import { useNotifications } from './hooks/useNotifications';
import type { KeyEntry, LogEntry, PubSubMessage, PageId } from './types';

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard', keys: 'Keys',
  metrics: 'Metrics', logs: 'Logs', pubsub: 'Pub/Sub',
};

function normaliseType(t: string): KeyEntry['type'] {
  const map: Record<string, KeyEntry['type']> = {
    string: 'String', hash: 'Hash', list: 'List', set: 'Set', zset: 'ZSet',
    String: 'String', Hash: 'Hash', List: 'List', Set: 'Set', ZSet: 'ZSet',
  };
  return map[t] ?? 'String';
}

export default function App() {
  const [page, setPage]       = useState<PageId>('dashboard');
  const [keys, setKeys]       = useState<KeyEntry[]>(() => INITIAL_KEYS);
  const [logs, setLogs]       = useState<LogEntry[]>(() => seedLogEntries(12));
  const [pubSubMsgs, setPubSubMsgs] = useState<PubSubMessage[]>([]);
  const [channels, setChannels]     = useState<string[]>(['events_core', 'global']);

  const [liveOps,      setLiveOps]      = useState<number[]>(() => Array(20).fill(0).map(() => 14000 + Math.random() * 8000));
  const [liveMemTrend, setLiveMemTrend] = useState<number[]>(() => Array(20).fill(0).map((_, i) => 400 + i * 25 + Math.random() * 20));

  const [opsPerSec,    setOpsPerSec]    = useState(15.5);
  const [memUsed,      setMemUsed]      = useState(890);
  const [totalKeys,    setTotalKeys]    = useState(0);
  const [cpu,          setCpu]          = useState(32);
  const [throughput,   setThroughput]   = useState(3.2);
  const [activeConns,  setActiveConns]  = useState(0);
  const [serverOnline, setServerOnline] = useState(false);

  const [cmdInput,     setCmdInput]     = useState('');
  const [cmdResult,    setCmdResult]    = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [notifOpen,    setNotifOpen]    = useState(false);

  // ── Feature hooks ────────────────────────────────────────────────────────
  const region = useRegion();
  const { notifications, push, dismiss, dismissAll } = useNotifications();

  // Track previous online state to fire notifications only on transitions
  const prevOnlineRef  = useRef<boolean | null>(null);
  const toastNotifIds  = useRef<Set<number>>(new Set());

  // ── Poll /api/metrics every second ──────────────────────────────────────
  useEffect(() => {
    const tick = async () => {
      const data = await api.metrics();

      if (data) {
        // Fire "back online" notification on recovery
        if (prevOnlineRef.current === false) {
          const id = push('Server reconnected — back online.', 'success');
          toastNotifIds.current.add(id);
        }
        prevOnlineRef.current = true;
        setServerOnline(true);

        const ops   = data.ops_per_sec ?? 0;
        const memMB = Math.max(1, Math.round(data.mem_bytes / (1024 * 1024)));

        setOpsPerSec(+(ops / 1000).toFixed(1));
        setMemUsed(memMB);
        setTotalKeys(data.key_count ?? 0);
        setActiveConns(data.active_conns ?? 0);
        setLiveOps(prev => [...prev.slice(1), ops]);
        setLiveMemTrend(prev => [...prev.slice(1), memMB]);
        setCpu(prev => Math.max(5, Math.min(95, prev + Math.floor((Math.random() - 0.48) * 3))));
        setThroughput(+(ops / 5000).toFixed(1));

        // Notify on high error rate
        if ((data.total_errors ?? 0) > 0 && data.total_ops > 0) {
          const errRate = data.total_errors / data.total_ops;
          if (errRate > 0.05) {
            push(`High error rate detected: ${(errRate * 100).toFixed(1)}% of commands failing.`, 'error', 8000);
          }
        }
      } else {
        // Fire "went offline" notification only on first miss
        if (prevOnlineRef.current === true || prevOnlineRef.current === null) {
          const id = push('Server connection lost — showing cached data.', 'error');
          toastNotifIds.current.add(id);
        }
        prevOnlineRef.current = false;
        setServerOnline(false);

        // Mock drift
        const newOps = 12000 + Math.random() * 10000;
        setLiveOps(prev => [...prev.slice(1), newOps]);
        setOpsPerSec(+(newOps / 1000).toFixed(1));
        setLiveMemTrend(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(1), Math.max(300, Math.min(1900, last + (Math.random() - 0.45) * 15))];
        });
        setMemUsed(prev => Math.max(600, Math.min(1950, prev + Math.floor((Math.random() - 0.45) * 10))));
        setCpu(prev  => Math.max(5, Math.min(95, prev + Math.floor((Math.random() - 0.48) * 5))));
        setThroughput(prev => Math.max(0.5, Math.min(9.8, +(prev + (Math.random() - 0.5) * 0.3).toFixed(1))));
        setLogs(prev => [genLogEntry(), ...prev].slice(0, 60));
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire region detection notification once
  useEffect(() => {
    if (region.city && region.city !== 'LOCAL') {
      push(`Region detected: ${region.label}`, 'info', 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.label]);

  // ── Poll /api/keys while on Keys page ───────────────────────────────────
  useEffect(() => {
    if (page !== 'keys') return;
    const fetchKeys = async () => {
      const data = await api.keys();
      if (data && data.length > 0) {
        setKeys(data.map((k, i) => ({
          id:   i + 1,
          key:  k.key,
          type: normaliseType(k.type),
          ttl:  k.ttl === -1 ? '∞' : k.ttl === -2 ? 'expired' : `${k.ttl}s`,
          size: '—',
          value: '',
        })));
      }
    };
    fetchKeys();
    const iv = setInterval(fetchKeys, 3000);
    return () => clearInterval(iv);
  }, [page]);

  // ── Mock pub/sub stream ──────────────────────────────────────────────────
  useEffect(() => {
    if (channels.length === 0) return;
    const iv = setInterval(() => {
      setPubSubMsgs(prev => [...prev, genPubSubMsg(channels)].slice(-50));
    }, 1200 + Math.random() * 800);
    return () => clearInterval(iv);
  }, [channels]);

  // ── Close notification panel when clicking outside ───────────────────────
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notif-panel]')) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // ── Key actions ──────────────────────────────────────────────────────────
  const handleDeleteKey = useCallback(async (id: number) => {
    const k = keys.find(x => x.id === id);
    if (k) {
      await api.deleteKey(k.key);
      push(`Key "${k.key}" deleted.`, 'warning', 4000);
    }
    setKeys(prev => prev.filter(x => x.id !== id));
  }, [keys, push]);

  const handleSaveKey = useCallback(async (id: number, newVal: string) => {
    const k = keys.find(x => x.id === id);
    if (k) {
      const res = await api.exec(`SET ${k.key} ${newVal}`);
      if (res?.result?.startsWith('+OK')) {
        push(`Key "${k.key}" updated.`, 'success', 3000);
      } else {
        push(`Failed to save "${k.key}".`, 'error', 5000);
      }
    }
    setKeys(prev => prev.map(x => x.id === id ? { ...x, value: newVal } : x));
  }, [keys, push]);

  // ── Command palette ──────────────────────────────────────────────────────
  const execCmd = useCallback(async () => {
    const cmd = cmdInput.trim();
    if (!cmd) return;
    const data = await api.exec(cmd);
    const result = data?.result ?? data?.error ?? '(server offline)';
    setCmdResult(result);

    if (data?.error) push(`Command error: ${data.error}`, 'error', 5000);

    setLogs(prev => [{
      id:      Date.now(),
      cmd:     cmd.split(' ')[0].toUpperCase(),
      key:     cmd.split(' ').slice(1).join(' '),
      latency: '—',
      ts:      new Date().toTimeString().slice(0, 8),
    }, ...prev].slice(0, 60));
  }, [cmdInput, push]);

  // ── Global search: navigate to Keys page and set search ─────────────────
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (q.trim() && page !== 'keys') setPage('keys');
  }, [page]);

  return (
    <div id="root" data-notif-panel>
      <Sidebar
        page={page}
        region={region}
        onNavigate={setPage}
      />

      <div className="main">
        <Topbar
          title={PAGE_TITLES[page]}
          serverOnline={serverOnline}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          notifications={notifications}
          notifOpen={notifOpen}
          onNotifToggle={() => setNotifOpen(o => !o)}
          onDismiss={dismiss}
          onDismissAll={dismissAll}
        />

        <div className="content">
          {page === 'dashboard' && (
            <DashboardPage
              liveOps={liveOps} liveMemTrend={liveMemTrend}
              totalKeys={totalKeys} memUsed={memUsed}
              opsPerSec={opsPerSec} logs={logs}
            />
          )}
          {page === 'keys' && (
            <KeyExplorerPage
              keys={keys}
              searchQuery={searchQuery}
              onDelete={handleDeleteKey}
              onSave={handleSaveKey}
            />
          )}
          {page === 'metrics' && (
            <MetricsPage
              liveOps={liveOps} liveMemTrend={liveMemTrend}
              cpu={cpu} throughput={throughput} activeConns={activeConns}
            />
          )}
          {page === 'logs'   && <LogsPage logs={logs} />}
          {page === 'pubsub' && (
            <PubSubPage
              messages={pubSubMsgs} channels={channels}
              onSubscribe={ch  => setChannels(p => [...p, ch])}
              onUnsubscribe={ch => setChannels(p => p.filter(c => c !== ch))}
            />
          )}

          <CommandPalette
            value={cmdInput} result={cmdResult}
            serverOnline={serverOnline}
            onChange={setCmdInput} onExec={execCmd}
          />
        </div>
      </div>

      {/* Floating toast notifications */}
      <ToastStrip toasts={notifications.slice(0, 3)} onDismiss={dismiss} />
    </div>
  );
}
