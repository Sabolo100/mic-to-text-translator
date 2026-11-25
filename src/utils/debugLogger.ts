export type LogEntry = { time: string; level: 'log' | 'warn' | 'error'; msg: string };
const storageKey = 'translator-debug-log';
let logs: LogEntry[] = [];
const listeners = new Set<() => void>();
let initialized = false;

function persist() {
  try { sessionStorage.setItem(storageKey, JSON.stringify(logs)); } catch { /* unavailable storage must never break the app */ }
}

function addEntry(level: LogEntry['level'], ...args: unknown[]) {
  const entry: LogEntry = {
    time: new Date().toLocaleTimeString(), level,
    msg: args.map(value => {
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      try { return typeof value === 'object' ? JSON.stringify(value) : String(value); }
      catch { return '[Unserializable value]'; }
    }).join(' ').slice(0, 2048),
  };
  logs = [...logs.slice(-199), entry];
  persist();
  listeners.forEach(listener => listener());
}

export function initLogger() {
  if (initialized) return;
  initialized = true;
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(saved)) logs = saved.filter((entry): entry is LogEntry =>
      entry && typeof entry.time === 'string' && typeof entry.msg === 'string' && ['log', 'warn', 'error'].includes(entry.level)
    ).slice(-200);
  } catch { logs = []; }
  for (const level of ['log', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => { original(...args); addEntry(level, ...args); };
  }
  window.addEventListener('error', event => addEntry('error', `WINDOW ERROR: ${event.message} at ${event.filename}:${event.lineno}`));
  window.addEventListener('unhandledrejection', event => addEntry('error', 'UNHANDLED REJECTION:', event.reason));
}

export function getLogs(): LogEntry[] { return [...logs]; }
export function clearLogs() { logs = []; persist(); listeners.forEach(listener => listener()); }
export function onLog(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
