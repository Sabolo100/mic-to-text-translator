

## Fix: JSON megjelenites helyett olvasmanyos szoveg

### Problema

Az AI modell strukturalt JSON objektumot ad vissza (title, bullet_points, notes), es bar az `ensureString` fuggveny stringge alakitja, a `JSON.stringify` nyers JSON szoveget mutat a felhasznalonak.

### Megoldas

Ket retegu javitas:

#### 1. Edge function prompt modositas (`supabase/functions/translate-slide/index.ts`)

A system promptban expliciten megkoveteljuk, hogy az `original` es `translated` mezok **sima szoveg** legyenek, NE strukturalt JSON objektumok:

```
Respond with: {"original": "plain text with line breaks", "translated": "plain text with line breaks"}
Do NOT nest objects inside original/translated - use plain text with newlines.
```

#### 2. `ensureString` okosabb formázása (`supabase/functions/translate-slide/index.ts`)

Ha az AI megis objektumot ad vissza, az `ensureString` fuggveny felismeri a strukturat es olvasmanyos szovegge alakitja:

```typescript
function ensureString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  // Ha strukturalt objektum (title, bullet_points, notes), formazzuk szepen
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.title) parts.push(String(obj.title));
    if (Array.isArray(obj.bullet_points)) {
      obj.bullet_points.forEach(bp => parts.push(`• ${bp}`));
    }
    if (obj.notes) parts.push(String(obj.notes));
    if (parts.length > 0) return parts.join('\n');
  }
  try { return JSON.stringify(val, null, 2); }
  catch { return String(val); }
}
```

### Modositando fajlok

| Fajl | Valtozas |
|------|--------|
| `supabase/functions/translate-slide/index.ts` | Prompt frissites + ensureString okos formatazas |

### Eredmeny

A dia kartyan a szoveg igy jelenik meg:
```
ENFORCE TAC
RESULT (2) - COMPARISON
- Deep Learning Detector
- Conventional Energy Detector
8 Rohd 26 Cognitive EW
```

A nyers JSON helyett olvasmanyos, strukturalt szoveg.
