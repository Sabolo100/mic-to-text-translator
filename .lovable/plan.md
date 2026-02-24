

## Terv: Kod javitasa + szoveg letoltes funkcio

### 1. Kritikus bug javitas: `handleAudioChunk` race condition

**Problema:** A `finally` blokk azonnal `setIsProcessing(false)`-ra allit, MIELOTT a `FileReader.onloadend` callback lefutna. Igy:
- Tobb chunk egyszerre feldolgozasra kerulhet
- Az `isProcessing` flag nem mukodik helyesen

**Megoldas:** A `FileReader`-t `Promise`-ba csomagolni, igy az `async/await` flow helyesen mukodik:

```typescript
const handleAudioChunk = async (audioBlob: Blob) => {
  if (isProcessing) return;
  setIsProcessing(true);
  
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const { data, error } = await supabase.functions.invoke('translate-speech', { ... });
    // ... feldolgozas
  } catch (error) {
    // ... hiba kezeles
  } finally {
    setIsProcessing(false);
  }
};
```

Uj segedfuggveny (`blobToBase64`) kiszervezese a `src/utils/audioUtils.ts` fajlba.

### 2. Szoveg letoltes funkcio

Uj gomb a ket megjelenitesi panel felett vagy a footer-ben, ami letolti a szoveget `.txt` fajlkent.

**Letoltes formatum:**
```text
Eredeti szoveg (hu):
[eredeti szoveg]

Forditas (en):
[forditott szoveg]

---
Generalta: Valos Ideju Fordito
Datum: 2026-02-24 14:30
```

**Implementacio:**
- `downloadTranscript` fuggveny az `Index.tsx`-ben
- `Blob` + `URL.createObjectURL` + virtualis `<a>` kattintas
- Gomb csak akkor aktiv, ha van szoveg (originalText vagy translatedText nem ures)

### 3. UI javitasok

**3.1. Letoltes gomb hozzaadasa:**
- A ket szovegpanel felett, jobbra igazitva egy "Letoltes" gomb (Download icon a lucide-react-bol)
- Disabled allapot ha nincs szoveg

**3.2. TranslationDisplay javitas:**
- A placeholder szoveg megkulonboztetese: az eredeti panel "Beszéljen a mikrofonba..." / a forditas panel "A fordítás itt jelenik meg..."
- Uresszoveg eseten `min-h` + centered layout javitas

**3.3. Nyelv csere gomb:**
- Egy `ArrowLeftRight` ikon gomb a ket nyelv kozott, ami felcsereli az input/output nyelvet
- Mobilon is lathato (a jelenlegi nyl csak desktopon latszik)

**3.4. Footer egyszerusites:**
- A footer szoveg eltavolitasa vagy minimalizalasa, felesleges informacio

### 4. Edge function CORS header javitas

A jelenlegi CORS header hianyzik nehany fontos header:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

### 5. Modositando fajlok osszefoglalasa

| Fajl | Valtozas |
|------|----------|
| `src/utils/audioUtils.ts` | **UJ** - `blobToBase64` segedfuggveny |
| `src/pages/Index.tsx` | Bug fix (async flow), letoltes gomb, nyelv csere gomb, UI atrendezes |
| `src/components/TranslationDisplay.tsx` | Placeholder szoveg prop, kisebb UI csiszolas |
| `src/components/RecordButton.tsx` | Valtoztatas nem szukseges |
| `supabase/functions/translate-speech/index.ts` | CORS header bovites |

### Technikai reszletek

**blobToBase64 utility:**
```typescript
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string).split(',')[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

**downloadTranscript fuggveny:**
```typescript
const downloadTranscript = () => {
  const inputName = LANGUAGES.find(l => l.code === inputLang)?.name ?? inputLang;
  const outputName = LANGUAGES.find(l => l.code === outputLang)?.name ?? outputLang;
  const timestamp = new Date().toLocaleString('hu-HU');
  
  const content = [
    `Eredeti szöveg (${inputName}):`,
    originalText || '(üres)',
    '',
    `Fordítás (${outputName}):`,
    translatedText || '(üres)',
    '',
    '---',
    `Generálta: Valós Idejű Fordító`,
    `Dátum: ${timestamp}`,
  ].join('\n');
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forditas_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Nyelv csere:**
```typescript
const swapLanguages = () => {
  setInputLang(outputLang);
  setOutputLang(inputLang);
};
```

