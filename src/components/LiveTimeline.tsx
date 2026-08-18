'use client';

import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { BroadcastIcon } from '@phosphor-icons/react/dist/ssr/Broadcast';
import { AlarmIcon } from '@phosphor-icons/react/dist/ssr/Alarm';
import { EmptyState, Section, Skeleton } from './ui';

const timelineRef = makeFunctionReference<'query'>('cases:timeline');
const armRef = makeFunctionReference<'action'>('followUps:armFromClient');
const cancelRef = makeFunctionReference<'mutation'>('followUps:cancel');

type Event = {
  _id: string;
  kind: string;
  label: string;
  detail?: string;
  at: number;
};
type FollowUp = { _id: string; dueAt: number; phone: string };

const TONE: Record<string, string> = {
  call_transcript: 'text-white',
  call_status: 'text-muted',
  call_ended: 'text-accent',
  followup_scheduled: 'text-warn',
  followup_fired: 'text-bad',
  followup_cancelled: 'text-muted',
};

export default function LiveTimeline({ caseId, phone }: { caseId: string; phone: string }) {
  const enabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL) && Boolean(caseId);
  const live = useQuery(timelineRef, enabled ? { caseId } : 'skip') as
    | { events: Event[]; followUps: FollowUp[] }
    | undefined;
  const arm = useAction(armRef);
  const cancel = useMutation(cancelRef);

  // The subscription is the real path. This paints the snapshot immediately and
  // keeps the panel alive if the venue network blocks WebSockets.
  const [snapshot, setSnapshot] = useState<{ events: Event[]; followUps: FollowUp[] } | undefined>();
  useEffect(() => {
    if (!enabled || live) return;
    let alive = true;
    const pull = () =>
      fetch(`/api/timeline/${caseId}`)
        .then((r) => r.json())
        .then((j) => {
          if (alive) setSnapshot({ events: j.events || [], followUps: j.followUps || [] });
        })
        .catch(() => {});
    void pull();
    const t = setInterval(pull, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled, caseId, live]);

  const data = live ?? snapshot;

  if (!enabled) return null;

  const loading = data === undefined;
  const events = data?.events || [];
  const pending = data?.followUps || [];
  const phoneValid = /^\+\d{8,15}$/.test(phone.replace(/[^\d+]/g, ''));

  return (
    <Section
      title="Live case timeline"
      hint="Every step writes to Convex, and Vapi posts each turn of the phone call straight to a Convex HTTP action. The transcript below arrives while the landlord is still talking, on every device watching this case."
      right={
        <span className="chip border-accent text-accent">
          <BroadcastIcon size={14} weight="fill" aria-hidden />
          Live
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void arm({ caseId, phone, delayMs: 14 * 86_400_000 })}
          disabled={!phoneValid}
          className="btn-ghost"
        >
          <AlarmIcon size={16} weight="bold" aria-hidden />
          Call automatically in 14 days
        </button>
        <button
          onClick={() => void arm({ caseId, phone, delayMs: 20_000 })}
          disabled={!phoneValid}
          className="btn-ghost"
        >
          Demo the timer, 20 seconds
        </button>
        {pending.length > 0 && (
          <button onClick={() => void cancel({ caseId })} className="btn-link">
            They replied, stand down
          </button>
        )}
      </div>

      {pending.map((f) => (
        <p key={f._id} className="mt-4 rounded-xl border border-line bg-raised px-4 py-3 text-base text-warn">
          Escalation armed. If {f.phone} has not replied by{' '}
          {new Date(f.dueAt).toLocaleString()}, RentProof calls them without being asked.
        </p>
      ))}

      {loading ? (
        <div className="mt-6 space-y-2" role="status" aria-live="polite">
          <span className="sr-only">Connecting to the live case</span>
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : events.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<BroadcastIcon size={24} aria-hidden />}
            title="Nothing on the wire yet"
            body="Analyse a contract or place the call and this fills in as it happens. Convex pushes each event, so there is no refresh and no polling."
          />
        </div>
      ) : (
        <ol className="mt-6 space-y-2">
          {events.map((e) => (
            <li key={e._id} className="rounded-xl border border-line bg-raised px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className={`text-base font-semibold ${TONE[e.kind] || 'text-white'}`}>
                  {e.label}
                </span>
                <span className="font-mono text-sm text-muted">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
              </div>
              {e.detail && (
                <p className="mt-2 max-w-prose680 text-base leading-relaxed text-muted">{e.detail}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
