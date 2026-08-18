export function stripFence(text: string): string {
  return text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

/** Models occasionally wrap JSON in prose. Grab the outermost object/array. */
export function parseJson<T>(text: string, fallback: T): T {
  const cleaned = stripFence(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* keep trying */
  }
  const start = cleaned.search(/[[{]/);
  if (start >= 0) {
    const open = cleaned[start];
    const close = open === '{' ? '}' : ']';
    const end = cleaned.lastIndexOf(close);
    if (end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* give up */
      }
    }
  }
  return fallback;
}

export function money(n: number | null | undefined, currency = 'USD'): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function dataUrlToInline(dataUrl: string): { mime_type: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime_type: m[1], data: m[2] };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function ok<T>(data: T) {
  return Response.json({ ok: true, ...(data as object) });
}

export function fail(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
