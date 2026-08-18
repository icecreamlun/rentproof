import { crawlStatutes, hasApify } from '@/lib/apify';
import { geminiJson, hasGemini } from '@/lib/gemini';
import { exaSearch, hasExa } from '@/lib/exa';
import { mockCitations } from '@/lib/mock';
import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { LawCitation } from '@/lib/types';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Exa finds the authoritative pages, Apify pulls their full text, Gemini turns
 * that text into quotable citations. Nothing here is recalled from memory —
 * every snippet is fetched, which is the whole point when you are about to
 * read a statute out loud to a landlord.
 */
export async function POST(req: Request) {
  try {
    const { caseId } = (await req.json()) as { caseId: string };
    if (!caseId) return fail('caseId required');

    const c = await loadCase(caseId);
    const jurisdiction = c.contract?.jurisdiction || 'California, USA';
    const assetType = c.contract?.assetType || 'residential rental';
    const disputed =
      c.comparison?.deltas
        ?.filter((d) => d.classification !== 'tenant_damage')
        .map((d) => d.area)
        .slice(0, 5)
        .join(', ') || 'carpet wear, nail holes, cleaning fees';

    if (!hasExa() && !hasApify()) {
      const cased = patchCase(caseId, { citations: mockCitations });
      return Response.json({ ok: true, mock: true, citations: mockCitations, case: cased });
    }

    // 1. Exa: find the statute and the tenant-rights guidance.
    let found: LawCitation[] = [];
    if (hasExa()) {
      const queries = [
        `${jurisdiction} security deposit statute text return deadline itemized statement ${assetType}`,
        `${jurisdiction} normal wear and tear vs damage security deposit deduction ${disputed}`,
      ];
      const batches = await Promise.allSettled(queries.map((q) => exaSearch(q, 5)));
      found = batches.flatMap((b) => (b.status === 'fulfilled' ? b.value : []));
    }

    // 2. Apify: pull the full text of the most authoritative hits.
    let crawled: LawCitation[] = [];
    if (hasApify()) {
      const authoritative = found
        .filter((f) => /\.gov|leginfo|legislature|courts\.|law\.cornell|justia|nolo|hud\./i.test(f.url))
        .slice(0, 3)
        .map((f) => f.url);
      if (authoritative.length) {
        try {
          crawled = await crawlStatutes(authoritative);
        } catch {
          crawled = [];
        }
      }
    }

    const pool = [...crawled, ...found].slice(0, 10);
    if (!pool.length) {
      const cased = patchCase(caseId, { citations: mockCitations });
      return Response.json({ ok: true, mock: true, citations: mockCitations, case: cased });
    }

    // 3. Gemini: reduce raw page text to quotable, correctly-numbered citations.
    let citations: LawCitation[] = pool.slice(0, 5);
    if (hasGemini()) {
      citations = await geminiJson<LawCitation[]>(
        `From the source material below, extract the 3 to 5 provisions that most directly support a renter disputing these deductions: ${disputed}. Jurisdiction: ${jurisdiction}.

Return a JSON array of:
{ "title": string, "citation": string, "url": string, "snippet": string, "source": "exa" }

Rules:
- "citation" must be the formal reference exactly as it appears in the source, e.g. "Cal. Civ. Code § 1950.5(b)". If the source does not state a section number, use the document title instead. Never construct a section number.
- "snippet" must be a VERBATIM quote of 1 to 3 sentences from the source. Do not paraphrase — this gets read out loud on a recorded call.
- "url" must be one of the URLs given below.
- Order by how useful the provision is to the renter.

SOURCES:
${pool.map((p, i) => `[${i + 1}] ${p.title}\nURL: ${p.url}\n${p.snippet.slice(0, 2500)}`).join('\n\n')}`,
        pool.slice(0, 5),
        { temperature: 0.05 },
      );
    }

    const cased = patchCase(caseId, { citations });
    return Response.json({
      ok: true,
      citations,
      sources: { exa: found.length, apify: crawled.length },
      case: cased,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
