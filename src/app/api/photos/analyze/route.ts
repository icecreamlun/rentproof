import { geminiJson, hasGemini } from '@/lib/gemini';
import { mockInventory } from '@/lib/mock';
import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { PhotoInventory } from '@/lib/types';
import { pushCase, pushEvent } from '@/lib/convexServer';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 90;

const SYSTEM = `You are a property condition inspector building an evidence record for a renter on the day they take possession.

Your job is to find and name every pre-existing defect, because anything you miss today becomes a deduction the renter cannot disprove later. Be specific about location. Never describe something you cannot actually see in the images.`;

const PROMPT = (checklist: string, assetType: string) => `These are move-in photographs of a ${assetType}. Build the condition record.

Return JSON with exactly this shape:
{
  "findings": [{ "area": string, "condition": string, "severity": "none"|"minor"|"moderate"|"severe", "preexisting": true, "note": string }],
  "questions": [string],
  "coverageGaps": [string],
  "summary": string
}

Rules:
- One finding per distinct defect you can actually see. "area" must locate it precisely, e.g. "Living room carpet — north wall", not "floor".
- "note": say whether this item is likely to show up on a deduction list later, and what the renter should do about it.
- "questions": 2 to 4 questions whose answers would materially change a future deposit dispute — cleanliness at move-in, whether a written inspection checklist was signed, the age of carpet or appliances. Do not ask anything you could answer from the photos.
- "coverageGaps": areas that are commonly charged for but are missing from this photo set.
- "summary": two sentences to the renter, plain English.
- If the photos show a vehicle or equipment instead of a home, adapt: panels, tyres, interior, screen, scratches, mileage.

${checklist}`;

export async function POST(req: Request) {
  try {
    const { caseId, photos } = (await req.json()) as { caseId: string; photos: string[] };
    if (!caseId) return fail('caseId required');
    if (!photos?.length) return fail('at least one photo required');

    const existing = await loadCase(caseId);
    const merged = [...existing.moveInPhotos, ...photos];

    if (!hasGemini()) {
      const c = patchCase(caseId, {
        moveInPhotos: merged,
        moveIn: mockInventory,
        stage: 'occupancy',
      });
      await pushCase(c);
      await pushEvent(caseId, 'evidence_logged', 'Condition record built', mockInventory.summary);
      return Response.json({ ok: true, mock: true, inventory: mockInventory, case: c });
    }

    const checklist = existing.contract?.photoChecklist?.length
      ? `The contract makes this renter liable for the following, so pay special attention:\n- ${existing.contract.photoChecklist.join('\n- ')}`
      : '';

    const inventory = await geminiJson<PhotoInventory>(
      PROMPT(checklist, existing.contract?.assetType || 'rental unit'),
      mockInventory,
      { system: SYSTEM, images: photos.slice(0, 12), temperature: 0.15 },
    );

    const c = patchCase(caseId, { moveInPhotos: merged, moveIn: inventory, stage: 'occupancy' });
    await pushCase(c);
    await pushEvent(
      caseId,
      'evidence_logged',
      `Condition record built, ${inventory.findings?.length || 0} defects on file`,
      inventory.summary,
    );
    return Response.json({ ok: true, inventory, case: c });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
