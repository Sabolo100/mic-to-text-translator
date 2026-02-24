

## Terv: Fekete kepernyo vegleges javitasa Android mobilon

### Problema gyokere

A debug logok alapjan a crash a `translate-slide` hivas UTAN tortenik - tehat a kep feldolgozas sikerult, de amikor a valasz visszaerkezik es a React ujrarajzolja a UI-t, a bongeszo tab elszall. Az ok:

1. **Egyideju memoria terheles**: A hangfelvetel folyamatosan fut (MediaRecorder + AudioContext + requestAnimationFrame ciklus), mikozben a dia valasz megjon es allapotfrissites tortenik
2. **FileReader megduplazza a memoriat**: A `readAsDataURL` a teljes eredeti kepet base64-be konvertalja MIELOTT a canvas atmeretezne - egy 2MB-os JPEG eseten ez ~5MB RAM-ot fogyaszt feleslegesen
3. **Parhuzamos state update-ek**: Audio chunk + slide response egyidoben triggerelnek React rendereket, ami mobilon tulorral

### Javitasok

#### 1. `src/utils/imageUtils.ts` - URL.createObjectURL hasznalata FileReader helyett

A `FileReader.readAsDataURL` helyett `URL.createObjectURL`-t hasznalunk, ami NEM masolja be a memoriba a teljes eredeti kepet - csak egy rovid URL-t ad, amirol a bongeszo kozvetlenul olvas.

```text
Regi mod:
  File (2MB) -> FileReader -> base64 string (5MB RAM) -> Image -> Canvas -> kis base64

Uj mod:
  File (2MB) -> createObjectURL (0 extra RAM) -> Image -> Canvas -> kis base64
```

#### 2. `src/pages/Index.tsx` - Audio szuneteltetese dia feldolgozas kozben

A `handleSlideCapture` fuggvenyben:
- A dia feldolgozas elott felfuggesztjuk az audio chunk feldolgozast (egy `skipAudioRef` flag-gel)
- A dia valasz megjon -> allapotfrissites -> `setTimeout`-tal varunk 100ms-t -> ujra engedelyezzuk az audio feldolgozast
- Igy soha nem tortenik egyszerre ket nehez state update

#### 3. `src/components/ErrorBoundary.tsx` - React ErrorBoundary

Egy ErrorBoundary komponens, ami elkapja a renderelesi hibakat es egy "Ujratoltesi" gombot mutat a fekete kepernyo helyett. Igy legrosszabb esetben sem fagy le teljesen az app.

#### 4. Debug logok bovitese

A `handleSlideCapture`-ben uj log sorok a valasz feldolgozas utanra is, hogy lassuk pontosan melyik lepesnel hal meg.

### Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `src/utils/imageUtils.ts` | FileReader helyett createObjectURL + revoke |
| `src/pages/Index.tsx` | Audio szuneteltetese dia kozben + bovebb logok |
| `src/components/ErrorBoundary.tsx` | UJ - crash vedelem |
| `src/App.tsx` | ErrorBoundary beepitese az app kore |

### Technikai reszletek

**imageUtils.ts uj megkozelites:**
```typescript
export function resizeImage(file: File, maxWidth = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // azonnal felszabaditjuk
      // ... canvas resize ugyanugy
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(...); };
    img.src = url;
  });
}
```

**Index.tsx audio szuneteltetese:**
```typescript
const skipAudioRef = useRef(false);

const handleAudioChunk = async (audioBlob: Blob) => {
  if (isProcessing || skipAudioRef.current) return; // skip dia kozben
  // ...
};

const handleSlideCapture = async (file: File) => {
  skipAudioRef.current = true; // audio szunet
  try {
    // ... feldolgozas
  } finally {
    setTimeout(() => { skipAudioRef.current = false; }, 200);
  }
};
```

**ErrorBoundary.tsx:**
```typescript
// React class component ami elkapja a renderelesi hibakat
// "Valami hiba tortent" uzenet + "Ujratoltes" gomb
// A fekete kepernyo helyett legalabb lathato hibauzenet
```

