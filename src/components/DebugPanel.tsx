import { useState, useEffect, useRef } from "react";
import { getLogs, clearLogs, onLog, type LogEntry } from "@/utils/debugLogger";
import { Bug, Trash2, Copy, X } from "lucide-react";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>(() => getLogs());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onLog(() => setEntries([...getLogs()]));
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, open]);

  const handleCopy = async () => {
    const text = entries.map(e => `[${e.time}] [${e.level}] ${e.msg}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleClear = () => { clearLogs(); setEntries([]); };

  const levelColor = (l: string) => {
    if (l === 'error') return 'text-red-400';
    if (l === 'warn') return 'text-yellow-400';
    return 'text-green-300';
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-full bg-zinc-800 text-white flex items-center justify-center shadow-lg border border-zinc-600"
      >
        <Bug size={20} />
      </button>

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-zinc-900/95 backdrop-blur text-xs font-mono border-t border-zinc-700 max-h-[40vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
            <span className="text-zinc-300 font-semibold">Debug Log ({entries.length})</span>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="text-zinc-400 hover:text-white"><Copy size={14} /></button>
              <button onClick={handleClear} className="text-zinc-400 hover:text-white"><Trash2 size={14} /></button>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white"><X size={14} /></button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-3 py-1">
            {entries.map((e, i) => (
              <div key={i} className={`py-0.5 ${levelColor(e.level)}`}>
                <span className="text-zinc-500">{e.time}</span> {e.msg}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </>
  );
}
