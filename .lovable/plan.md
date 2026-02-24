

## Terv: AI szovegszepites letoltes elott

### Problema

A beszedfelismero altal generalt szoveg toredelezett, ismetlodhet, es nem olvasmanyos, mert a beszelt nyelv termeszetesen ilyen. Letoltes elott egy AI modell atirhata olvasmanyos, osszefuggo szovegge.

### Megoldas

Uj edge function (`polish-text`), amely a Lovable AI Gateway-t hasznalja (LOVABLE_API_KEY mar elerheto) a nyers szoveg atfogalmazasara. A letoltes gomb eloszor meghivja ezt a funkciort, majd az eredmenyt tolti le.

### 1. Uj edge function: `supabase/functions/polish-text/index.ts`

- Bemenete: `originalText`, `translatedText`, `inputLang`, `outputLang`
- Mindket szoveget kulon-kulon atiratja a Lovable AI-val (google/gemini-2.5-flash)
- System prompt: "Ird at az alabbi beszelt nyelvi szoveget olvasmanyos, osszefuggo irodalmi szovegge. Tartsd meg az eredeti ertelmet, de szuntesd meg az ismetleseket, toltelekszavakat, es tedd folyekonnya. Csak az atirt szoveget add vissza."
- Valasz: `{ polishedOriginal, polishedTranslation }`

```text
Pelda prompt flow:
  User input (nyers): "Szoval en azt gondolom hogy... hogy ez a... ez a megoldas jo lenne, ugye, es akkor... akkor csinalhatnnank valamit"
  AI output (tiszta): "Ugy gondolom, hogy ez a megoldas jo lenne, es csinalhatnnank valamit."
```

### 2. config.toml frissites

```toml
[functions.polish-text]
verify_jwt = false
```

### 3. Frontend modositas (`src/pages/Index.tsx`)

- `downloadTranscript` atirasa `async` fuggvenyre
- Letoltes elott: loading allapot jelzese (pl. a gomb "Feldolgozas..." szoveget mutat)
- Supabase `functions.invoke('polish-text', ...)` hivas
- Sikeres valasz eseten a "polished" szoveget tolti le
- Hiba eseten fallback: a nyers szoveget tolti le (mint eddig)

### 4. Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `supabase/functions/polish-text/index.ts` | UJ - AI szovegszepito edge function |
| `supabase/config.toml` | polish-text function regisztracio |
| `src/pages/Index.tsx` | downloadTranscript async + AI hivas + loading state |

### Technikai reszletek

**Edge function vazlat:**
```typescript
// Ket kulon AI hivas: eredeti es forditott szovegre
// System prompt nyelvenként specifikus
// Model: google/gemini-2.5-flash (gyors, olcso)
// Hiba eseten: visszaadja az eredeti szoveget valtozatlanul
```

**Frontend flow:**
```text
[Letoltes gomb kattintas]
  -> gomb disabled + "Feldolgozas..."
  -> supabase.functions.invoke('polish-text', { originalText, translatedText, inputLang, outputLang })
  -> siker: letoltes a szepitett szoveggel
  -> hiba: letoltes a nyers szoveggel + toast figyelmezetes
  -> gomb ujra aktiv
```

