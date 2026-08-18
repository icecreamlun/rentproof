import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { buildCaseBrief, hasVapi, placeCall } from '@/lib/vapi';
import { pushCase, pushEvent } from '@/lib/convexServer';
import { fail, newId } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { caseId, to } = (await req.json()) as { caseId: string; to?: string };
    if (!caseId) return fail('caseId required');

    const c = await loadCase(caseId);
    const number = (to || c.contract?.parties?.landlordPhone || '').replace(/[^\d+]/g, '');
    if (!/^\+\d{8,15}$/.test(number)) {
      return fail('need a phone number in E.164 format, e.g. +14155550142');
    }

    if (!hasVapi()) {
      const entry = {
        id: `mock_${newId()}`,
        status: 'simulated',
        to: number,
        startedAt: new Date().toISOString(),
        mock: true,
      };
      patchCase(caseId, { callLog: [...(c.callLog || []), entry] });
      await pushEvent(caseId, 'call_status', `Call simulated to ${number}`, 'No Vapi key on this deployment.');
      return Response.json({
        ok: true,
        mock: true,
        call: entry,
        brief: buildCaseBrief(c),
        note: 'VAPI_API_KEY / VAPI_PHONE_NUMBER_ID not set — this is the brief that would have been dialled.',
      });
    }

    const result = await placeCall(c, number);
    const entry = {
      id: result.id,
      status: result.status,
      to: number,
      startedAt: new Date().toISOString(),
    };
    const saved = patchCase(caseId, { callLog: [...(c.callLog || []), entry] });
    await pushCase(saved);
    await pushEvent(caseId, 'call_status', `Dialling ${number}`, `Vapi call ${result.id}`);
    return Response.json({ ok: true, call: entry, brief: buildCaseBrief(c) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
