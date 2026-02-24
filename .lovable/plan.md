

## Terv: Beepitett bug logger + fekete kepernyo javitas

### 1. Beepitett Debug Log Panel

Letrehozunk egy appba epitett log rendszert, ami a telefonon is lathato. Ez felulirja a `console.log`, `console.error`, `console.warn` metodusokat, es a logokat egy felcsukhato panelben jeleníti meg az app aljan.

**Uj fajl: `src/components/DebugPanel.tsx`**
- Egy felcsukhato panel az app aljan (egy kis "Bug" gomb nyitja/zarva)
- Megjeleniti az osszes elfogott log uzenetet idopecssettel
- Szinekkel megkulonbozteti: info (feher), warn (sarga), error (piros)
- "Torles" gomb a logok torlesesere
- "Masolas" gomb ami az osszes logot a vagolapra masolja (igy laptoprol is lathatod)
- Max 200 log tarolasa, FIFO

**Uj fajl: `src/utils/debugLogger.ts`**
- Globalis log tarolo (tomb)
- `initLogger()`: felulirja a `console.log/warn/error`-t ugy, hogy az eredeti is meghivodjon + a belso tombbe is keruljön
- `getLogs()`, `clearLogs()`, `onLog(callback)` fuggvenyek
- Hibakat is elfogja: `window.onerror` es `window.onunhandledrejection`

### 2. Fekete kepernyo javitas

A fekete kepernyo valoszinuleg azert tortenik, mert:
- A nagy base64 string a `FileReader.readAsDataURL`-bol tul sok memoriat hasznal mobilon
- Vagy a React komponens tree ujrarendereleskor valami crash tortenik

**Javitasok:**
- A `resizeImage`-ben a `FileReader` eredmenyet (ami a teljes eredeti kep base64-ben) expliciten felszabaditjuk
- A `handleSlideCapture`-ben `try/catch` korul mindent wrappelunk es a debug loggerbe irjuk
- Az `img` objektumot is explicit toroljuk (`img.src = ''`) a canvas muvelet utan
- A `finally` blokkban mindig `setIsProcessingSlide(false)` - ez mar megvan, de az uj loggerrel latni fogjuk pontosan hol akad el

### 3. Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `src/utils/debugLogger.ts` | UJ - globalis log elfogo rendszer |
| `src/components/DebugPanel.tsx` | UJ - megjelenito panel |
| `src/pages/Index.tsx` | DebugPanel beepitese + logger inicializalas |
| `src/utils/imageUtils.ts` | Memoria felszabaditas javitas (img.src = '') |

### Technikai reszletek

**debugLogger.ts vazlat:**
```typescript
type LogEntry = { time: string; level: 'log'|'warn'|'error'; msg: string };
let logs: LogEntry[] = [];
let listeners: ((entry: LogEntry) => void)[] = [];

export function initLogger() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  
  const addEntry = (level, ...args) => {
    const entry = { time: new Date().toLocaleTimeString(), level, msg: args.map(String).join(' ') };
    logs.push(entry);
    if (logs.length > 200) logs.shift();
    listeners.forEach(fn => fn(entry));
  };
  
  console.log = (...args) => { origLog(...args); addEntry('log', ...args); };
  // ... hasonloan warn es error
  
  window.onerror = (msg, src, line) => addEntry('error', `${msg} at ${src}:${line}`);
  window.onunhandledrejection = (e) => addEntry('error', 'Unhandled:', e.reason);
}
```

**DebugPanel.tsx vazlat:**
- Egy fix positioned "🐛" gomb a jobb also sarokban
- Kattintasra kinyilik egy max 40vh magas scrollozhato lista a logokkal
- Minden sor: idopecset + szinezett szoveg
- "Masolas" gomb: `navigator.clipboard.writeText(...)` - igy a laptopon beilllesztheted

Ez lehetove teszi, hogy a kovetkezo tesztnel pontosan lassd, mi tortenik a telefonon a dia feldolgozas soran - es en is latom ha bemasolod.

