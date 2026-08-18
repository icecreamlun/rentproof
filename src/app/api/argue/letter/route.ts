import { geminiJson, hasGemini } from '@/lib/gemini';
import { mockLetter } from '@/lib/mock';
import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { DemandLetter } from '@/lib/types';
import { buildCaseBrief } from '@/lib/vapi';
import { pushCase, pushEvent } from '@/lib/convexServer';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 90;

const SYSTEM = `You draft security-deposit demand letters that get paid without a court date.

What works: itemised facts, verbatim statutory quotes, one clear number, one clear deadline, and an explicit concession of anything the renter genuinely owes. What does not work: outrage, threats, legalese theatre, or a citation you cannot back up.

Write as the renter, first person. Never cite a statute that is not in the provided citation list.`;

export async function POST(req: Request) {
  try {
    const { caseId, tone } = (await req.json()) as {
      caseId: string;
      tone?: 'firm' | 'friendly' | 'final_notice';
    };
    if (!caseId) return fail('caseId required');

    const c = await loadCase(caseId);

    if (!hasGemini()) {
      return Response.json({
        ok: true,
        mock: true,
        letter: mockLetter,
        case: patchCase(caseId, { letter: mockLetter }),
      });
    }

    const toneNote = {
      friendly: 'Cooperative and warm. Assume an honest mistake. Invite a phone call.',
      firm: 'Businesslike and unmistakably serious. State the legal exposure once, without gloating.',
      final_notice:
        'This is the last letter before a small claims filing. State that plainly, give the filing venue, and keep it short.',
    }[tone || 'firm'];

    const letter = await geminiJson<DemandLetter>(
      `Draft the demand letter.

TONE: ${toneNote}

Return JSON:
{ "subject": string, "body": string, "citations": [string], "demandAmount": number, "deadlineDays": number }

Rules:
- Number the disputed items and address each in one short paragraph: what the move-in photo shows, what the move-out photo shows, the legal category, the dollar conclusion.
- Concede every item classified as tenant damage explicitly and by amount. This is what makes the rest credible.
- Quote at most two statutes, verbatim, from the citation list only.
- "demandAmount" is the unlawfully withheld figure. "deadlineDays" is 14 unless the statutory window says otherwise.
- End with a plain sentence preferring resolution without a filing.
- "body" is the letter text only — no markdown, no placeholders in brackets. Sign off with the renter's name.

CASE BRIEF:
${buildCaseBrief(c)}

CITATIONS AVAILABLE:
${(c.citations || []).map((x) => `- ${x.citation || x.title}: "${x.snippet.slice(0, 300)}" (${x.url})`).join('\n') || '- none on file; write the letter on the facts alone and cite nothing'}`,
      mockLetter,
      { system: SYSTEM, temperature: 0.3 },
    );

    const saved = patchCase(caseId, { letter });
    await pushCase(saved);
    await pushEvent(caseId, 'letter_drafted', 'Demand letter drafted', letter.subject, letter.demandAmount);
    return Response.json({ ok: true, letter, case: saved });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
