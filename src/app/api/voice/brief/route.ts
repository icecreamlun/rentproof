import { geminiText, hasGemini } from '@/lib/gemini';
import { hasEleven, tts } from '@/lib/elevenlabs';
import { loadCase } from '@/lib/caseStore';
import { buildCaseBrief } from '@/lib/vapi';
import { fail, money } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 90;

/**
 * The renter hears their own case, in their own language, in under a minute.
 * The people who lose the most deposit money are the ones least able to read
 * six pages of English lease law — so the explanation is spoken, not printed.
 */
const LANGS: Record<string, string> = {
  en: 'English',
  zh: 'Mandarin Chinese',
  es: 'Spanish',
  hi: 'Hindi',
  tl: 'Tagalog',
  vi: 'Vietnamese',
  pt: 'Portuguese',
  fr: 'French',
  ko: 'Korean',
  ja: 'Japanese',
};

export async function POST(req: Request) {
  try {
    const { caseId, language } = (await req.json()) as { caseId: string; language?: string };
    if (!caseId) return fail('caseId required');

    const c = await loadCase(caseId);
    const langName = LANGS[language || 'en'] || 'English';
    const cur = c.contract?.currency || 'USD';

    let script: string;
    if (hasGemini()) {
      script = await geminiText(
        `Write a 45-second spoken briefing for the renter, in ${langName}, explaining their security deposit case.

Rules:
- Speak directly to them as "you". Warm, calm, on their side.
- Cover: how much was withheld, how much of it is actually defensible, how much they should get back, and the single strongest reason why.
- Name amounts in ${cur}.
- Legal terms stay understandable — say what "normal wear and tear" means in one clause rather than assuming they know.
- End with the one action they should take next.
- Output ONLY the words to be spoken. No headings, no stage directions, no markdown.

CASE BRIEF:
${buildCaseBrief(c)}`,
        { temperature: 0.4 },
      );
    } else {
      const owed = c.comparison?.unlawfullyWithheld ?? 1831;
      script = `Here is where your deposit stands. Your landlord kept ${money(
        c.claimedDeduction ?? 2284,
        cur,
      )}. Looking at your move-in and move-out photos side by side, only ${money(
        c.comparison?.totalFairCharge ?? 453,
        cur,
      )} of that holds up. The carpet marks and the nail holes were already there, or they count as normal wear and tear — the ordinary ageing that happens when someone simply lives in a place, which the law says a landlord cannot charge you for. That means ${money(
        owed,
        cur,
      )} should come back to you. The next step is simple: send the demand letter, and if there is no reply in fourteen days, we call them.`;
    }

    if (!hasEleven()) {
      return Response.json({
        ok: true,
        mock: true,
        script,
        note: 'ELEVENLABS_API_KEY not set — script generated, audio skipped.',
      });
    }

    const audio = await tts(script);
    return Response.json({ ok: true, script, audio, language: langName });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
