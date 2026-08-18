import { hasApify, landlordComplaints } from '@/lib/apify';
import { mockLandlord } from '@/lib/mock';
import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Apify sweep for public deposit complaints against this specific landlord. */
export async function POST(req: Request) {
  try {
    const { caseId, name, city } = (await req.json()) as {
      caseId: string;
      name?: string;
      city?: string;
    };
    if (!caseId) return fail('caseId required');

    const c = await loadCase(caseId);
    const target = name || c.contract?.parties?.landlord || '';
    if (!target) return fail('no landlord name on file');

    if (!hasApify()) {
      const intel = { ...mockLandlord, name: target };
      return Response.json({
        ok: true,
        mock: true,
        intel,
        case: patchCase(caseId, { landlordIntel: intel }),
      });
    }

    const intel = await landlordComplaints(target, city || c.contract?.jurisdiction);
    if (!intel) return fail('lookup failed');
    return Response.json({ ok: true, intel, case: patchCase(caseId, { landlordIntel: intel }) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
