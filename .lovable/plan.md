
## Terv: Prezentacios dia fotozo es fordito funkcio

### Funkciok osszefoglalasa

A felhasznalo a mobiltelefonjan hallgatja a prezentaciot (a rendszer kozben forditja a beszédet), es kozben le tudja fotozni / feltolteni a kivetitett dia kepet. A rendszer:
1. Felismeri a kepen levo szoveget (OCR)
2. Leforditja a cel nyelvre
3. Jol strukturaltan megjeleníti egy kulon mezoben
4. A letoltott txt fajlba is bekerulnek a dia-fordítasok kulon bekezdesekent

### Architektura

```text
[Felhasznalo fotoz] 
    -> base64 kep
    -> supabase edge function: translate-slide
    -> Lovable AI (gemini-2.5-flash multimodal: kep + szoveg)
    -> visszaadja: { originalSlideText, translatedSlideText }
    -> megjelenik a UI-ban + beepul a letoltesbe
```

A Gemini modellek tamogatjak a multimodalis bemenetet (kep + szoveg), igy egyetlen AI hivassal megoldhato az OCR + forditas + strukturalas.

### 1. Uj edge function: `supabase/functions/translate-slide/index.ts`

- Bemenete: `image` (base64 string), `outputLang` (cel nyelv kodu)
- A Lovable AI Gateway-t hasznalja `google/gemini-2.5-flash` modellel
- A kep `data:image/...;base64,...` formatumban kerul at az AI-nak (multimodal input)
- System prompt: "Elemezd a prezentacios dia kepet. Olvasd ki a szoveget, majd forditsd le a cel nyelvre. Strukturald a kimenetet: cim, felsorolaspontok, megjegyzesek. Add vissza ket szekcioban: ORIGINAL es TRANSLATED."
- Valasz: `{ originalSlideText: string, translatedSlideText: string }`

### 2. Frontend modositasok (`src/pages/Index.tsx`)

**Uj state valtozok:**
- `slideEntries: Array<{ id: number, original: string, translated: string }>` - osszes feltoltott dia
- `isProcessingSlide: boolean` - dia feldolgozas folyamatban

**Uj funkcio: `handleSlideCapture`**
- Mobilon: megnyitja a kamera appot (capture="environment" attributum az input elemen)
- Desktopon: fajl valaszto
- A kivalasztott kepet base64-re konvertalja
- Meghivja a `translate-slide` edge function-t
- Az eredmenyt hozzaadja a `slideEntries` tombhoz

**UI valtozasok:**
- Uj "Dia fotozasa" gomb (Camera ikon) a Record gomb mellett/alatt
- Uj szekció a forditasi panelek alatt: "Dia fordítások" - kartyakent megjelenitve, mindegyik tartalmazza az eredeti es forditott szoveget
- A feldolgozas kozben loading indikator jelenik meg

**Letoltes bovitese:**
- A `downloadTranscript` fuggveny a dia fordítasokat is hozzaadja a txt fajlhoz kulon szekcioként:
```text
Eredeti szöveg (Magyar):
[beszed szoveg]

Fordítás (English):
[forditas]

--- Prezentációs diák ---

[Dia 1]
Eredeti: [dia szoveg]
Fordítás: [dia forditas]

[Dia 2]
...
```

### 3. Uj komponens: `src/components/SlideCapture.tsx`

- Kamera/fajl input gomb (rejtett `<input type="file" accept="image/*" capture="environment">`)
- Mobilon automatikusan a hatso kamerat nyitja meg
- Megjeleniti a feltoltott diak listaját kartyakent
- Minden kartya: kis elonezeti kep + eredeti szoveg + forditott szoveg
- Torlesi lehetoseg kartyankent

### 4. Uj komponens: `src/components/SlideTranslationCard.tsx`

- Egyetlen dia megjelenítese: sorszam, eredeti szoveg, forditott szoveg
- Kompakt, osszecsukhato (Collapsible) kartya formatum
- Torles gomb

### 5. config.toml frissites

```toml
[functions.translate-slide]
verify_jwt = false
```

### 6. Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `supabase/functions/translate-slide/index.ts` | UJ - kep felismeres + forditas edge function |
| `src/components/SlideCapture.tsx` | UJ - kamera/feltoltes gomb komponens |
| `src/components/SlideTranslationCard.tsx` | UJ - dia forditas kartya komponens |
| `src/pages/Index.tsx` | slideEntries state, handleSlideCapture, UI bovites, letoltes bovites |
| `supabase/config.toml` | translate-slide regisztracio |

### Technikai reszletek

**Edge function - multimodalis AI hivas:**
```typescript
// A Gemini modell tamogatja a kep + szoveg bemenetet
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: `Egy prezentacios dia kepet kapsz. Olvasd ki a szoveget strukturaltan (cim, pontok), majd forditsd le erre a nyelvre: ${outputLang}. Valaszolj JSON formatumban: {"original": "...", "translated": "..."}`
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: 'text', text: 'Kérlek elemezd és fordítsd le ezt a diát.' }
        ]
      }
    ],
  }),
});
```

**Mobil kamera input:**
```html
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleFileSelect}
  className="hidden"
/>
```
Az `capture="environment"` attributum mobilon a hatso kamerat nyitja, igy a felhasznalo egyszeruen rafotozhat a kivetitett diara.

**Kep merete optimalizalas:**
- A feltoltott kepet canvas-al atmeretezzuk max 1920px szelessegre a feltoltes elott
- Ez csokkenti a base64 meretet es gyorsitja az AI feldolgozast
- A `src/utils/audioUtils.ts` fajlt kiegeszitjuk egy `resizeImage` utility-vel
