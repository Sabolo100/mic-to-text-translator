/** Format both structured values and JSON encoded inside strings for display. */
export function readableText(value: unknown, depth = 0): string {
  if (value == null || depth > 12) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    const unwrapped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    if (unwrapped.startsWith('[') || unwrapped.startsWith('{')) {
      try { return readableText(JSON.parse(unwrapped), depth + 1); } catch { /* plain text */ }
    }
    return text;
  }
  if (Array.isArray(value)) {
    return value.map(item => readableText(item, depth + 1)).filter(Boolean).map(item => `• ${item}`).join('\n');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(item => readableText(item, depth + 1)).filter(Boolean).join('\n');
  }
  return String(value);
}

export function parseSlideResponse(content: unknown): { original: string; translated: string } {
  if (typeof content !== 'string') throw new Error('Invalid slide response');
  const json = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid slide response');
  const fields = parsed as Record<string, unknown>;
  return { original: readableText(fields.original), translated: readableText(fields.translated) };
}