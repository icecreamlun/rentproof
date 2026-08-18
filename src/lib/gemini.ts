import { dataUrlToInline, parseJson } from './util';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export type GeminiOpts = {
  system?: string;
  images?: string[];      // data URLs
  model?: string;
  temperature?: number;
  json?: boolean;
};

/**
 * Thin REST wrapper — no SDK, so nothing to install and nothing to break at
 * 7pm. Returns raw text; callers parse.
 */
export async function geminiText(prompt: string, opts: GeminiOpts = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');

  const model =
    opts.model ||
    (opts.images?.length
      ? process.env.GEMINI_VISION_MODEL || 'gemini-3.6-flash'
      : process.env.GEMINI_MODEL || 'gemini-3.6-flash');

  const parts: Part[] = [{ text: prompt }];
  for (const img of opts.images || []) {
    const inline = dataUrlToInline(img);
    if (inline) parts.push({ inline_data: inline });
  }

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: 8192,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (json.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
}

export async function geminiJson<T>(prompt: string, fallback: T, opts: GeminiOpts = {}): Promise<T> {
  const text = await geminiText(prompt, { ...opts, json: true });
  return parseJson<T>(text, fallback);
}
