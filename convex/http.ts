import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';

const http = httpRouter();

/**
 * Vapi posts here directly, at https://<deployment>.convex.site/vapi.
 *
 * The Next server is deliberately not in this path. A phone call emits a dozen
 * events over three minutes, and each one has to reach every open tab watching
 * the case. Convex takes the webhook, writes it, and the subscription pushes it
 * out. Nothing polls, and the transcript appears on screen while the landlord
 * is still talking.
 */
const vapi = httpAction(async (ctx, request) => {
  const body = (await request.json().catch(() => ({}))) as {
    message?: {
      type?: string;
      call?: { id?: string; assistantOverrides?: { variableValues?: { caseId?: string } } };
      transcript?: string;
      transcriptType?: string;
      role?: string;
      status?: string;
      endedReason?: string;
      analysis?: { summary?: string };
      artifact?: { transcript?: string };
    };
  };

  const m = body.message || {};
  const caseId =
    m.call?.assistantOverrides?.variableValues?.caseId ||
    new URL(request.url).searchParams.get('caseId') ||
    '';

  if (!caseId) return new Response('missing caseId', { status: 200 });

  const write = (kind: string, label: string, detail?: string) =>
    ctx.runMutation(api.cases.logEvent, { caseId, kind, label, detail });

  switch (m.type) {
    case 'status-update':
      await write('call_status', `Call ${m.status || 'updated'}`, m.endedReason);
      break;
    case 'transcript':
      // Vapi streams a partial per word. Only the settled turn belongs on screen.
      if (m.transcriptType === 'final' && m.transcript?.trim()) {
        await write(
          'call_transcript',
          m.role === 'assistant' ? 'RentProof' : 'Landlord',
          m.transcript.trim(),
        );
      }
      break;
    case 'end-of-call-report':
      await write(
        'call_ended',
        'Call finished',
        m.analysis?.summary || m.artifact?.transcript?.slice(0, 600) || m.endedReason,
      );
      break;
    default:
      if (m.type) await write('call_event', m.type);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

http.route({ path: '/vapi', method: 'POST', handler: vapi });

export default http;
