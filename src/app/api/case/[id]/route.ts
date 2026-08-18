import { loadCase } from '@/lib/caseStore';
import { patchCase } from '@/lib/store';
import { pushCase } from '@/lib/convexServer';
import { CaseFile } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json({ ok: true, case: await loadCase(id) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = (await req.json()) as Partial<CaseFile>;
  await loadCase(id);
  const next = patchCase(id, patch);
  await pushCase(next);
  return Response.json({ ok: true, case: next });
}
