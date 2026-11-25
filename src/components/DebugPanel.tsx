import { useState, useEffect, useRef } from "react";
import { getLogs, clearLogs, onLog, type LogEntry } from "@/utils/debugLogger";
import { Button } from "@/components/ui/button";
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
    if (l === 'error') return 'text-destructive';
    if (l === 'warn') return 'text-accent';
    return 'text-foreground';
  };

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        aria-label="Hibanapló megnyitása"
        title="Hibanapló"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-full bg-secondary text-foreground flex items-center justify-center shadow-lg border border-border"
      >
        <Bug size={20} />
      </Button>

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-card/95 backdrop-blur text-xs font-mono border-t border-border max-h-[40vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-foreground font-semibold">Hibanapló ({entries.length})</span>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" aria-label="Napló másolása" title="Napló másolása" onClick={handleCopy} className="text-muted-foreground hover:text-foreground"><Copy size={14} /></Button>
              <Button size="icon" variant="ghost" aria-label="Napló törlése" title="Napló törlése" onClick={handleClear} className="text-muted-foreground hover:text-foreground"><Trash2 size={14} /></Button>
              <Button size="icon" variant="ghost" aria-label="Napló bezárása" title="Napló bezárása" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></Button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-3 py-1">
            {entries.map((e, i) => (
              <div key={i} className={`py-0.5 break-words whitespace-pre-wrap ${levelColor(e.level)}`}>
                <span className="text-muted-foreground">{e.time}</span> {e.msg}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </>
  );
}
