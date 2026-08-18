import { geminiJson, hasGemini } from '@/lib/gemini';
import { mockContract } from '@/lib/mock';
import { patchCase } from '@/lib/store';
import { ContractAnalysis } from '@/lib/types';
import { pushCase, pushEvent } from '@/lib/convexServer';
import { fail } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a tenant-side lease attorney. You read rental and hire agreements of any kind — apartments, cars, equipment, storage — and find the clauses that will cost the renter money later.

You are adversarial on the renter's behalf but never invent law. If you are unsure whether a clause is unenforceable in the stated jurisdiction, say the clause is "worth challenging" rather than asserting it is illegal. Quote clause text verbatim from the document.`;

const PROMPT = (extra: string) => `Analyse the attached rental agreement.

Return JSON with exactly this shape:
{
  "assetType": string,
  "jurisdiction": string,
  "jurisdictionCode": string,
  "depositAmount": number | null,
  "monthlyRent": number | null,
  "currency": string,
  "returnWindowDays": number | null,
  "parties": { "tenant": string, "landlord": string, "landlordEmail": string, "landlordPhone": string },
  "redFlags": [{ "clause": string, "issue": string, "risk": "low"|"medium"|"high", "lawNote": string, "suggestedPushback": string }],
  "overallRiskScore": number,
  "summary": string,
  "photoChecklist": [string]
}

Rules:
- "returnWindowDays" is the STATUTORY deposit-return deadline for the jurisdiction, not whatever the lease claims. If the lease contradicts the statute, that contradiction is a red flag.
- "redFlags": 2 to 6 items, worst first. Focus on clauses that let the owner keep deposit money: non-refundable fees, blanket replacement obligations, cleaning flat fees, waivers of statutory rights, inflated late fees, and deadlines longer than the law allows.
- "photoChecklist": 5 to 8 specific things this particular renter should photograph before taking possession, derived from what the contract makes them liable for.
- "overallRiskScore": 0 (clean) to 100 (predatory).
- "summary": two sentences, plain English, addressed to the renter as "you".
- Empty string for any party field you cannot find. Never guess a phone number or email.
${extra}`;

export async function POST(req: Request) {
  try {
    const { caseId, contractText, files } = (await req.json()) as {
      caseId: string;
      contractText?: string;
      files?: string[];
    };
    if (!caseId) return fail('caseId required');

    if (!hasGemini()) {
      const c = patchCase(caseId, { contract: mockContract, contractText, stage: 'move_in' });
      await pushCase(c);
      await pushEvent(caseId, 'contract_analysed', 'Contract read', mockContract.summary);
      return Response.json({ ok: true, mock: true, contract: mockContract, case: c });
    }

    const extra = contractText?.trim()
      ? `\n\nCONTRACT TEXT:\n${contractText.slice(0, 60000)}`
      : '';

    const contract = await geminiJson<ContractAnalysis>(PROMPT(extra), mockContract, {
      system: SYSTEM,
      images: files || [],
      temperature: 0.1,
    });

    const c = patchCase(caseId, { contract, contractText, stage: 'move_in' });
    await pushCase(c);
    await pushEvent(
      caseId,
      'contract_analysed',
      `Contract read, ${contract.redFlags?.length || 0} clauses worth fighting`,
      contract.summary,
    );
    return Response.json({ ok: true, contract, case: c });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
