import { LandlordIntel, LawCitation } from './types';

export const hasApify = () => Boolean(process.env.APIFY_TOKEN);

const CRAWLER = () => process.env.APIFY_CRAWLER_ACTOR || 'apify~website-content-crawler';
const SEARCH = () => process.env.APIFY_SEARCH_ACTOR || 'apify~google-search-scraper';

async function runActor<T>(actor: string, input: unknown, timeoutMs = 90_000): Promise<T[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const url =
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&timeout=${Math.floor(timeoutMs / 1000)}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Apify ${actor} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()) as T[];
  } finally {
    clearTimeout(t);
  }
}

/** Crawl the authoritative statute pages so citations quote real text, not a hallucination. */
export async function crawlStatutes(urls: string[]): Promise<LawCitation[]> {
  if (!urls.length) return [];
  const items = await runActor<{ url: string; title?: string; text?: string; markdown?: string }>(
    CRAWLER(),
    {
      startUrls: urls.map((url) => ({ url })),
      maxCrawlPages: urls.length,
      maxCrawlDepth: 0,
      crawlerType: 'cheerio',
      saveMarkdown: true,
      proxyConfiguration: { useApifyProxy: true },
    },
  );

  return items
    .filter((i) => (i.text || i.markdown || '').length > 200)
    .map((i) => ({
      title: i.title || new URL(i.url).hostname,
      citation: '',
      url: i.url,
      snippet: (i.text || i.markdown || '').replace(/\s+/g, ' ').slice(0, 1500),
      source: 'apify' as const,
    }));
}

/** Prior-complaint signal on the landlord — the "this is a repeat offender" beat. */
export async function landlordComplaints(name: string, city?: string): Promise<LandlordIntel | null> {
  if (!name.trim()) return null;
  const query = `"${name}" ${city || ''} landlord security deposit complaint OR lawsuit OR review`.trim();

  const items = await runActor<{
    organicResults?: { title?: string; description?: string; url?: string }[];
  }>(SEARCH(), { queries: query, resultsPerPage: 20, maxPagesPerQuery: 1, countryCode: 'us' });

  const organic = items.flatMap((i) => i.organicResults || []);
  const hits = organic.filter((r) =>
    /deposit|complaint|lawsuit|sued|withheld|scam|slumlord|violation/i.test(
      `${r.title} ${r.description}`,
    ),
  );

  return {
    name,
    complaintCount: hits.length,
    signals: hits.slice(0, 8).map((h) => ({
      source: h.url ? new URL(h.url).hostname : 'web',
      text: `${h.title || ''} — ${h.description || ''}`.slice(0, 300),
      url: h.url,
    })),
    summary: hits.length
      ? `${hits.length} public records mention deposit disputes involving ${name}.`
      : `No public deposit complaints found for ${name}.`,
  };
}
