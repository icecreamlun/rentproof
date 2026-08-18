import { geminiJson, hasGemini } from '@/lib/gemini';
import { mockComparison } from '@/lib/mock';
import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { ComparisonResult } from '@/lib/types';
import { pushCase, pushEvent } from '@/lib/convexServer';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SYSTEM = `You are a neutral property-damage assessor whose findings will be read out on a phone call and, if it goes badly, filed in small claims court.

Credibility is your only asset. If an item genuinely is tenant damage, say so and price it fairly — conceding real damage is what makes the rest of the argument land. If you cannot tell from the images, classify it "unclear" and set the charge to zero rather than guessing.

The legal line you are drawing: normal wear and tear is deterioration that occurs from ordinary, reasonable use over time and is NOT chargeable. Damage is deterioration from negligence, accident or abuse and IS chargeable, prorated for the item's remaining useful life.`;

const PROMPT = (ctx: string) => `The first group of images is the MOVE-IN condition. The second group is the MOVE-OUT condition. Compare them area by area.

Return JSON with exactly this shape:
{
  "deltas": [{
    "area": string,
    "before": string,
    "after": string,
    "changed": boolean,
    "classification": "normal_wear_and_tear"|"tenant_damage"|"pre_existing"|"unclear",
    "severity": "none"|"minor"|"moderate"|"severe",
    "fairChargeUsd": number,
    "reasoning": string,
    "confidence": number
  }],
  "totalFairCharge": number,
  "claimedDeduction": number | null,
  "unlawfullyWithheld": number,
  "verdict": "deposit_should_be_returned"|"partial_deduction_justified"|"deduction_justified",
  "headline": string,
  "summary": string
}

Rules:
- Cover every area the landlord charged for, plus any change you can see for yourself.
- "reasoning" is the sentence that will be read to the landlord. Point at the visual evidence first, then the legal category. One or two sentences.
- "fairChargeUsd" is the defensible repair cost, 0 for wear and tear or pre-existing conditions.
- "unlawfullyWithheld" = claimedDeduction - totalFairCharge, floored at 0.
- "headline" is one short sentence with the dollar figure in it, addressed to the renter.
- "confidence" reflects how clearly the images support your call.

${ctx}`;

export async function POST(req: Request) {
  try {
    const { caseId, photos, claimedDeduction, landlordStatement } = (await req.json()) as {
      caseId: string;
      photos: string[];
      claimedDeduction?: number | null;
      landlordStatement?: string;
    };
    if (!caseId) return fail('caseId required');

    const existing = await loadCase(caseId);
    const moveOutPhotos = [...existing.moveOutPhotos, ...(photos || [])];
    if (!existing.moveInPhotos.length && !moveOutPhotos.length && hasGemini()) {
      return fail('upload move-in and move-out photos first');
    }

    if (!hasGemini()) {
      const comparison = {
        ...mockComparison,
        claimedDeduction: claimedDeduction ?? mockComparison.claimedDeduction,
        unlawfullyWithheld: Math.max(
          0,
          (claimedDeduction ?? mockComparison.claimedDeduction ?? 0) - mockComparison.totalFairCharge,
        ),
      };
      comparison.headline = `$${comparison.unlawfullyWithheld.toLocaleString()} of your deposit is being withheld unlawfully`;
      const c = patchCase(caseId, {
        moveOutPhotos,
        claimedDeduction: claimedDeduction ?? null,
        landlordStatement,
        comparison,
        stage: 'dispute',
      });
      await pushCase(c);
      await pushEvent(caseId, 'verdict', comparison.headline, comparison.summary, comparison.unlawfullyWithheld);
      return Response.json({ ok: true, mock: true, comparison, case: c });
    }

    const ctxParts: string[] = [];
    ctxParts.push(`MOVE-IN PHOTO COUNT: ${existing.moveInPhotos.length}. MOVE-OUT PHOTO COUNT: ${moveOutPhotos.length}.`);
    if (existing.contract) {
      ctxParts.push(
        `JURISDICTION: ${existing.contract.jurisdiction}. DEPOSIT: ${existing.contract.depositAmount} ${existing.contract.currency}.`,
      );
    }
    if (existing.moveIn?.findings?.length) {
      ctxParts.push(
        'PRE-EXISTING DEFECTS ALREADY ON RECORD FROM MOVE-IN:\n- ' +
          existing.moveIn.findings.map((f) => `${f.area}: ${f.condition}`).join('\n- '),
      );
    }
    if (existing.answers && Object.keys(existing.answers).length) {
      ctxParts.push(
        'RENTER ANSWERS:\n' +
          Object.entries(existing.answers)
            .map(([q, a]) => `Q: ${q}\nA: ${a}`)
            .join('\n'),
      );
    }
    if (claimedDeduction != null) ctxParts.push(`AMOUNT THE LANDLORD WITHHELD: ${claimedDeduction}`);
    if (landlordStatement?.trim()) {
      ctxParts.push(`LANDLORD'S ITEMISED STATEMENT (their words):\n${landlordStatement.slice(0, 8000)}`);
    }

    const comparison = await geminiJson<ComparisonResult>(
      PROMPT(ctxParts.join('\n\n')),
      mockComparison,
      {
        system: SYSTEM,
        images: [...existing.moveInPhotos.slice(0, 8), ...moveOutPhotos.slice(0, 8)],
        temperature: 0.15,
      },
    );

    if (claimedDeduction != null) {
      comparison.claimedDeduction = claimedDeduction;
      comparison.unlawfullyWithheld = Math.max(0, claimedDeduction - (comparison.totalFairCharge || 0));
    }

    const c = patchCase(caseId, {
      moveOutPhotos,
      claimedDeduction: claimedDeduction ?? null,
      landlordStatement,
      comparison,
      stage: 'dispute',
    });
    await pushCase(c);
    await pushEvent(
      caseId,
      'verdict',
      comparison.headline,
      comparison.summary,
      comparison.unlawfullyWithheld,
    );
    return Response.json({ ok: true, comparison, case: c });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
