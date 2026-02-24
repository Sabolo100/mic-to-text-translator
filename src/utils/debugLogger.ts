export type LogEntry = { time: string; level: 'log' | 'warn' | 'error'; msg: string };

let logs: LogEntry[] = [];
let listeners: ((entry: LogEntry) => void)[] = [];
let initialized = false;

function addEntry(level: LogEntry['level'], ...args: unknown[]) {
  const entry: LogEntry = {
    time: new Date().toLocaleTimeString(),
    level,
    msg: args.map(a => {
      try {
        return typeof a === 'object' ? JSON.stringify(a) : String(a);
      } catch { return String(a); }
    }).join(' '),
  };
  logs.push(entry);
  if (logs.length > 200) logs.shift();
  listeners.forEach(fn => fn(entry));
}

export function initLogger() {
  if (initialized) return;
  initialized = true;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args: unknown[]) => { origLog(...args); addEntry('log', ...args); };
  console.warn = (...args: unknown[]) => { origWarn(...args); addEntry('warn', ...args); };
  console.error = (...args: unknown[]) => { origError(...args); addEntry('error', ...args); };

  window.onerror = (msg, src, line) => {
    addEntry('error', `WINDOW ERROR: ${msg} at ${src}:${line}`);
  };
  window.onunhandledrejection = (e) => {
    addEntry('error', 'UNHANDLED REJECTION:', e.reason);
  };
}

export function getLogs(): LogEntry[] { return logs; }
export function clearLogs() { logs = []; }
export function onLog(cb: (entry: LogEntry) => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}
