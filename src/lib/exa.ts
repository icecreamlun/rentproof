import { LawCitation } from './types';

export const hasExa = () => Boolean(process.env.EXA_API_KEY);

type ExaResult = {
  title?: string;
  url: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
};

/** Exa neural search over statutes, tenant-rights guides and case law. */
export async function exaSearch(query: string, numResults = 6): Promise<LawCitation[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];

  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify({
      query,
      numResults,
      type: 'auto',
      contents: { text: { maxCharacters: 1200 }, highlights: { numSentences: 3 } },
    }),
  });

  if (!res.ok) throw new Error(`Exa ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const json = (await res.json()) as { results?: ExaResult[] };
  return (json.results || []).map((r) => ({
    title: r.title || new URL(r.url).hostname,
    citation: '',
    url: r.url,
    snippet: (r.highlights?.join(' ') || r.text || '').slice(0, 700),
    source: 'exa' as const,
  }));
}
