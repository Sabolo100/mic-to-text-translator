

## Fix: React Error #31 - Object rendered as React child

### Root Cause

The Gemini AI model sometimes returns `parsed.original` and `parsed.translated` as nested JSON objects (e.g., `{"title": "...", "bullets": ["..."]}`) instead of plain strings. When this object reaches the `SlideTranslationCard` component and gets rendered inside `<p>{original}</p>`, React throws error #31 ("Objects are not valid as a React child").

### Fix Strategy

Two layers of protection:

#### 1. Edge Function (`supabase/functions/translate-slide/index.ts`)

Force `parsed.original` and `parsed.translated` to strings before returning:

```typescript
function ensureString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  try { return JSON.stringify(val, null, 2); } 
  catch { return String(val); }
}

// In response:
originalSlideText: ensureString(parsed.original),
translatedSlideText: ensureString(parsed.translated),
```

#### 2. Frontend safety (`src/pages/Index.tsx`)

Add a safety check when adding slide entries, so even if the edge function somehow returns an object, it won't crash React:

```typescript
const safeStr = (v: unknown): string => 
  typeof v === 'string' ? v : JSON.stringify(v) ?? '';

setSlideEntries(prev => [...prev, {
  id: Date.now(),
  original: safeStr(data.originalSlideText) || '(nem sikerult kiolvasni)',
  translated: safeStr(data.translatedSlideText) || '(nem sikerult leforditani)',
}]);
```

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/translate-slide/index.ts` | Add `ensureString` helper, apply to response fields |
| `src/pages/Index.tsx` | Add `safeStr` guard when creating slide entries |

