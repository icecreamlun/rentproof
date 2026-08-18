import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { CaseFile } from './types';

/**
 * Referenced by name rather than through the generated api object, so the Next
 * build never depends on `convex dev` having run first.
 */
const upsertRef = makeFunctionReference<'mutation'>('cases:upsert');
const logRef = makeFunctionReference<'mutation'>('cases:logEvent');
const getRef = makeFunctionReference<'query'>('cases:get');

export const hasConvex = () => Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

function client(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url ? new ConvexHttpClient(url) : null;
}

/** Convex holds the durable copy. Never let a sync failure break the request. */
export async function pushCase(c: CaseFile): Promise<void> {
  const cx = client();
  if (!cx) return;
  try {
    await cx.mutation(upsertRef, {
      caseId: c.id,
      stage: c.stage,
      jurisdiction: c.contract?.jurisdiction,
      landlord: c.contract?.parties?.landlord,
      claimedDeduction: c.claimedDeduction ?? undefined,
      unlawfullyWithheld: c.comparison?.unlawfullyWithheld ?? undefined,
      payload: JSON.stringify(c),
    });
  } catch {
    /* the file store still has it */
  }
}

export async function pushEvent(
  caseId: string,
  kind: string,
  label: string,
  detail?: string,
  amount?: number,
): Promise<void> {
  const cx = client();
  if (!cx) return;
  try {
    await cx.mutation(logRef, { caseId, kind, label, detail, amount });
  } catch {
    /* non fatal */
  }
}

/**
 * On serverless there is no shared disk and each lambda has its own memory, so
 * the durable copy in Convex is what makes a case survive the gap between
 * uploading move in photos and coming back a year later to compare them.
 */
export async function fetchRemoteCase(caseId: string): Promise<CaseFile | null> {
  const cx = client();
  if (!cx) return null;
  try {
    const row = (await cx.query(getRef, { caseId })) as { payload?: string } | null;
    return row?.payload ? (JSON.parse(row.payload) as CaseFile) : null;
  } catch {
    return null;
  }
}
