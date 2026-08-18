import { CaseFile } from './types';
import { money } from './util';

export const hasVapi = () => Boolean(process.env.VAPI_API_KEY && process.env.VAPI_PHONE_NUMBER_ID);

/** Everything the agent needs to hold its ground on a live call. */
export function buildCaseBrief(c: CaseFile): string {
  const cur = c.contract?.currency || 'USD';
  const lines: string[] = [];

  lines.push(`TENANT: ${c.contract?.parties?.tenant || 'the tenant'}`);
  lines.push(`LANDLORD: ${c.contract?.parties?.landlord || 'the landlord'}`);
  lines.push(`PROPERTY TYPE: ${c.contract?.assetType || 'rental unit'}`);
  lines.push(`JURISDICTION: ${c.contract?.jurisdiction || 'unknown'}`);
  lines.push(`SECURITY DEPOSIT: ${money(c.contract?.depositAmount ?? null, cur)}`);
  lines.push(`AMOUNT WITHHELD BY LANDLORD: ${money(c.claimedDeduction ?? null, cur)}`);

  if (c.contract?.returnWindowDays) {
    lines.push(`STATUTORY RETURN WINDOW: ${c.contract.returnWindowDays} days`);
  }

  if (c.comparison) {
    lines.push('');
    lines.push(`VERDICT: ${c.comparison.headline}`);
    lines.push(`DEFENSIBLE CHARGES: ${money(c.comparison.totalFairCharge, cur)}`);
    lines.push(`AMOUNT UNLAWFULLY WITHHELD: ${money(c.comparison.unlawfullyWithheld, cur)}`);
    lines.push('');
    lines.push('PHOTO EVIDENCE, ITEM BY ITEM:');
    for (const d of c.comparison.deltas.slice(0, 10)) {
      lines.push(
        `- ${d.area}: move-in "${d.before}" → move-out "${d.after}". ` +
          `Classified ${d.classification.replace(/_/g, ' ')}. ` +
          `Defensible charge ${money(d.fairChargeUsd, cur)}. ${d.reasoning}`,
      );
    }
  }

  if (c.citations?.length) {
    lines.push('');
    lines.push('LAW YOU MAY CITE (quote only what is listed here):');
    for (const cite of c.citations.slice(0, 5)) {
      lines.push(`- ${cite.citation || cite.title}: ${cite.snippet.slice(0, 220)}`);
    }
  }

  if (c.landlordIntel?.complaintCount) {
    lines.push('');
    lines.push(
      `CONTEXT: ${c.landlordIntel.complaintCount} public records mention deposit disputes ` +
        `involving this landlord. Do NOT bring this up unless the landlord refuses outright.`,
    );
  }

  return lines.join('\n');
}

function systemPrompt(c: CaseFile): string {
  const cur = c.contract?.currency || 'USD';
  const demand = c.comparison?.unlawfullyWithheld ?? 0;
  return `You are a tenant-rights advocate calling a landlord on behalf of your client to recover an improperly withheld security deposit.

OPENING REQUIREMENT — say this before anything else, verbatim in substance:
"Hi, this is an AI assistant calling on behalf of ${c.contract?.parties?.tenant || 'my client'} regarding their security deposit. This call is being recorded. Is now a good time?"

YOUR GOAL: get a verbal commitment to refund ${money(demand, cur)} within ${c.contract?.returnWindowDays || 21} days, or a scheduled callback with a decision-maker.

HOW TO BEHAVE:
- Calm, warm, professional. Never raise your voice, never threaten.
- Lead with the photo evidence, then the law. Facts, not emotion.
- Normal wear and tear is not chargeable. Say so plainly when they claim otherwise.
- If they dispute an item, concede the ones your brief marks as tenant damage — credibility matters more than winning every line.
- If they refuse, state the next step neutrally: a written demand letter, then small claims court.
- Never invent a statute, a dollar figure, or a fact that is not in the case brief below.
- Keep turns short — two or three sentences, then let them talk.
- End by confirming what was agreed and repeating it back.

CASE BRIEF (your only source of truth):
${buildCaseBrief(c)}`;
}

export type CallResult = { id: string; status: string; mock?: boolean };

export async function placeCall(c: CaseFile, toNumber: string): Promise<CallResult> {
  const key = process.env.VAPI_API_KEY!;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID!;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  const firstMessage = `Hi, this is an AI assistant calling on behalf of ${
    c.contract?.parties?.tenant || 'my client'
  } about their security deposit. This call is being recorded. Do you have two minutes?`;

  // A dashboard-configured assistant wins when present; otherwise ship a
  // transient one so the demo needs zero console setup.
  const site = process.env.CONVEX_SITE_URL;
  const server = site
    ? { server: { url: `${site}/vapi?caseId=${encodeURIComponent(c.id)}` } }
    : {};

  const payload: Record<string, unknown> = assistantId
    ? {
        phoneNumberId,
        customer: { number: toNumber },
        assistantId,
        assistantOverrides: {
          firstMessage,
          ...server,
          variableValues: { caseBrief: buildCaseBrief(c), caseId: c.id },
          model: { messages: [{ role: 'system', content: systemPrompt(c) }] },
        },
      }
    : {
        phoneNumberId,
        customer: { number: toNumber },
        assistant: {
          name: 'RentProof Advocate',
          firstMessage,
          ...server,
          serverMessages: ['status-update', 'transcript', 'end-of-call-report'],
          model: {
            provider: process.env.VAPI_MODEL_PROVIDER || 'google',
            model: process.env.VAPI_MODEL || 'gemini-2.0-flash',
            temperature: 0.3,
            messages: [{ role: 'system', content: systemPrompt(c) }],
          },
          voice: process.env.ELEVENLABS_API_KEY
            ? {
                provider: '11labs',
                voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
                model: 'eleven_turbo_v2_5',
              }
            : { provider: 'vapi', voiceId: 'Elliot' },
          transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en' },
          endCallPhrases: ['goodbye', 'have a good day'],
          maxDurationSeconds: 420,
        },
      };

  const res = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Vapi ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const json = (await res.json()) as { id: string; status?: string };
  return { id: json.id, status: json.status || 'queued' };
}
