import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

export const runtime = 'nodejs';

const timelineRef = makeFunctionReference<'query'>('cases:timeline');

/**
 * The live panel is driven by a Convex subscription. This is the snapshot it
 * paints from on mount, and the safety net for a venue network that blocks
 * WebSockets.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return Response.json({ ok: true, events: [], followUps: [] });

  try {
    const data = await new ConvexHttpClient(url).query(timelineRef, { caseId });
    return Response.json({ ok: true, ...(data as object) });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message, events: [], followUps: [] });
  }
}
