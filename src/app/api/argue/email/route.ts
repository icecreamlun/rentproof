import { loadCase } from '@/lib/caseStore';
import { pushEvent } from '@/lib/convexServer';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';

/** Resend if a key is present; otherwise hand the client a mailto: it can open. */
export async function POST(req: Request) {
  try {
    const { caseId, to } = (await req.json()) as { caseId: string; to?: string };
    if (!caseId) return fail('caseId required');

    const c = await loadCase(caseId);
    if (!c.letter) return fail('generate the demand letter first');

    const recipient = to || c.contract?.parties?.landlordEmail || '';
    if (!recipient) return fail('no landlord email on file');

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
        c.letter.subject,
      )}&body=${encodeURIComponent(c.letter.body)}`;
      return Response.json({ ok: true, mock: true, mailto, to: recipient });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'RentProof <onboarding@resend.dev>',
        to: [recipient],
        subject: c.letter.subject,
        text: c.letter.body,
      }),
    });

    if (!res.ok) return fail(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`, 502);
    const json = (await res.json()) as { id?: string };
    await pushEvent(caseId, 'letter_sent', `Letter sent to ${recipient}`, c.letter.subject);
    return Response.json({ ok: true, id: json.id, to: recipient });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
