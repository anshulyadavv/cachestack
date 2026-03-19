import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CommandPalette } from './components/CommandPalette';
import { DashboardPage } from './pages/DashboardPage';
import { KeyExplorerPage } from './pages/KeyExplorerPage';
import { MetricsPage } from './pages/MetricsPage';
import { LogsPage } from './pages/LogsPage';
import { PubSubPage } from './pages/PubSubPage';
import { api } from './api/client';
import { INITIAL_KEYS, genLogEntry, genPubSubMsg, seedLogEntries } from './api/mock';
import type { KeyEntry, LogEntry, PubSubMessage, PageId } from './types';

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard',
  keys:      'Keys',
  metrics:   'Metrics',
  logs:      'Logs',
  pubsub:    'Pub/Sub',
};

export default function App() {
  // Navigation
  const [page, setPage] = useState<PageId>('dashboard');

  // Data state
  const [keys,       setKeys]       = useState<KeyEntry[]>(() => INITIAL_KEYS);
  const [logs,       setLogs]       = useState<LogEntry[]>(() => seedLogEntries(12));
  const [pubSubMsgs, setPubSubMsgs] = useState<PubSubMessage[]>([]);
  const [channels,   setChannels]   = useState<string[]>(['events_core', 'global']);

  // Live chart series (rolling window of 20 points)
  const [liveOps,      setLiveOps]      = useState<number[]>(() => Array(20).fill(0).map(() => 14000 + Math.random() * 8000));
  const [liveMemTrend, setLiveMemTrend] = useState<number[]>(() => Array(20).fill(0).map((_, i) => 400 + i * 25 + Math.random() * 20));

  // Scalar metrics
  const [opsPerSec,   setOpsPerSec]   = useState(15.5);
  const [memUsed,     setMemUsed]     = useState(890);
  const [cpu,         setCpu]         = useState(32);
  const [throughput,  setThroughput]  = useState(3.2);
  const [activeConns, setActiveConns] = useState(0);

  // Connection status
  const [serverOnline, setServerOnline] = useState(false);

  // Command palette
  const [cmdInput,  setCmdInput]  = useState('');
  const [cmdResult, setCmdResult] = useState('');

  // ── Poll /api/metrics every second ──────────────────────────────────────
  useEffect(() => {
    let prevOps = opsPerSec * 1000;

    const tick = async () => {
      const data = await api.metrics();

      if (data) {
        setServerOnline(true);
        const ops   = data.ops_per_sec ?? 0;
        const memMB = Math.max(1, Math.round(data.mem_bytes / (1024 * 1024)));

        setOpsPerSec(+(ops / 1000).toFixed(1));
        setMemUsed(memMB);
        setActiveConns(data.active_conns ?? 0);
        setLiveOps(prev => [...prev.slice(1), ops]);
        setLiveMemTrend(prev => [...prev.slice(1), memMB]);
        setCpu(prev => Math.max(5, Math.min(95, prev + Math.floor((Math.random() - 0.48) * 3))));
        setThroughput(+(data.mem_bytes / 1e9 + Math.random() * 0.5).toFixed(1));
        if (ops > prevOps * 0.5) setLogs(prev => [genLogEntry(), ...prev].slice(0, 60));
        prevOps = ops;
      } else {
        setServerOnline(false);
        // Mock drift when offline
        const newOps = 12000 + Math.random() * 10000;
        setLiveOps(prev => [...prev.slice(1), newOps]);
        setOpsPerSec(+(newOps / 1000).toFixed(1));
        setLiveMemTrend(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(1), Math.max(300, Math.min(1900, last + (Math.random() - 0.45) * 15))];
        });
        setMemUsed(prev  => Math.max(600, Math.min(1950, prev  + Math.floor((Math.random() - 0.45) * 10))));
        setCpu(prev      => Math.max(5,   Math.min(95,   prev  + Math.floor((Math.random() - 0.48) * 5))));
        setThroughput(prev => Math.max(0.5, Math.min(9.8, +(prev + (Math.random() - 0.5) * 0.3).toFixed(1))));
        setLogs(prev => [genLogEntry(), ...prev].slice(0, 60));
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll /api/keys every 3 s while on the Keys page ──────────────────────
  useEffect(() => {
    if (page !== 'keys') return;

    const fetchKeys = async () => {
      const data = await api.keys();
      if (data && data.length > 0) {
        setKeys(data.map((k, i) => ({
          id: i + 1,
          key: k.key,
          type: 'String',
          ttl: k.ttl === -1 ? '∞' : k.ttl === -2 ? 'expired' : `${k.ttl}s`,
          size: '—',
          value: '(click Edit to load)',
        })));
      }
    };

    fetchKeys();
    const iv = setInterval(fetchKeys, 3000);
    return () => clearInterval(iv);
  }, [page]);

  // ── Mock pub/sub message generator ────────────────────────────────────────
  useEffect(() => {
    if (channels.length === 0) return;
    const iv = setInterval(() => {
      setPubSubMsgs(prev => [...prev, genPubSubMsg(channels)].slice(-50));
    }, 1200 + Math.random() * 800);
    return () => clearInterval(iv);
  }, [channels]);

  // ── Key actions ───────────────────────────────────────────────────────────
  const handleDeleteKey = useCallback(async (id: number) => {
    const k = keys.find(x => x.id === id);
    if (k) await api.deleteKey(k.key);
    setKeys(prev => prev.filter(x => x.id !== id));
  }, [keys]);

  const handleSaveKey = useCallback(async (id: number, newVal: string) => {
    const k = keys.find(x => x.id === id);
    if (k) await api.exec(`SET ${k.key} ${newVal}`);
    setKeys(prev => prev.map(x => x.id === id ? { ...x, value: newVal } : x));
  }, [keys]);

  // ── Command palette ───────────────────────────────────────────────────────
  const execCmd = useCallback(async () => {
    const cmd = cmdInput.trim();
    if (!cmd) return;

    const data = await api.exec(cmd);
    setCmdResult(data?.result ?? data?.error ?? '(server offline — command not sent)');

    setLogs(prev => [{
      id: Date.now(),
      cmd: cmd.split(' ')[0].toUpperCase(),
      key: cmd.split(' ').slice(1).join(' '),
      latency: '—',
      ts: new Date().toTimeString().slice(0, 8),
    }, ...prev].slice(0, 60));
  }, [cmdInput]);

  return (
    <div id="root">
      <Sidebar page={page} onNavigate={setPage} />

      <div className="main">
        <Topbar title={PAGE_TITLES[page]} serverOnline={serverOnline} />

        <div className="content">
          {page === 'dashboard' && (
            <DashboardPage
              liveOps={liveOps}
              liveMemTrend={liveMemTrend}
              totalKeys={keys.length * 100000}
              memUsed={memUsed}
              opsPerSec={opsPerSec}
              logs={logs}
            />
          )}
          {page === 'keys' && (
            <KeyExplorerPage keys={keys} onDelete={handleDeleteKey} onSave={handleSaveKey} />
          )}
          {page === 'metrics' && (
            <MetricsPage
              liveOps={liveOps}
              liveMemTrend={liveMemTrend}
              cpu={cpu}
              throughput={throughput}
              activeConns={activeConns}
            />
          )}
          {page === 'logs'   && <LogsPage logs={logs} />}
          {page === 'pubsub' && (
            <PubSubPage
              messages={pubSubMsgs}
              channels={channels}
              onSubscribe={ch  => setChannels(p => [...p, ch])}
              onUnsubscribe={ch => setChannels(p => p.filter(c => c !== ch))}
            />
          )}

          <CommandPalette
            value={cmdInput}
            result={cmdResult}
            serverOnline={serverOnline}
            onChange={setCmdInput}
            onExec={execCmd}
          />
        </div>
      </div>
    </div>
  );
}
