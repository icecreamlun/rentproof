import { mockCitations, mockComparison, mockContract, mockInventory, mockLandlord } from '@/lib/mock';
import { patchCase } from '@/lib/store';
import { pushCase, pushEvent } from '@/lib/convexServer';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';

/**
 * Stage insurance. If the venue wifi dies mid-demo, one click loads a complete
 * case so the argument, the letter and the call still work.
 */
export async function POST(req: Request) {
  try {
    const { caseId } = (await req.json()) as { caseId: string };
    if (!caseId) return fail('caseId required');

    const c = patchCase(caseId, {
      stage: 'dispute',
      contract: mockContract,
      moveIn: mockInventory,
      comparison: mockComparison,
      citations: mockCitations,
      landlordIntel: mockLandlord,
      claimedDeduction: mockComparison.claimedDeduction,
    });
    await pushCase(c);
    await pushEvent(caseId, 'contract_analysed', 'Contract read', mockContract.summary);
    await pushEvent(caseId, 'evidence_logged', 'Condition record built', mockInventory.summary);
    await pushEvent(
      caseId,
      'verdict',
      mockComparison.headline,
      mockComparison.summary,
      mockComparison.unlawfullyWithheld,
    );
    return Response.json({ ok: true, case: c });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
