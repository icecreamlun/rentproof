'use client';

import { ReactNode } from 'react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';

export function Dots({ label }: { label: string }) {
  return (
    <span className="dots inline-flex items-center gap-2">
      {label}
      <span aria-hidden>·</span>
      <span aria-hidden>·</span>
      <span aria-hidden>·</span>
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

/** Loading placeholders are shaped like the panel they stand in for. */
export function ResultSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" role="status" aria-live="polite">
      <span className="sr-only">Analysing</span>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-3 h-4 w-full max-w-prose680" />
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

export function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
          {hint && <p className="mt-2 max-w-prose680 text-base leading-relaxed text-muted">{hint}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function RiskPill({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const map = {
    low: 'border-line text-muted',
    medium: 'border-warn text-warn',
    high: 'border-bad text-bad',
  } as const;
  return (
    <span
      className={`rounded-full border bg-raised px-3 py-1 text-xs font-semibold uppercase tracking-widest ${map[risk]}`}
    >
      {risk}
    </span>
  );
}

const CLASS_STYLE: Record<string, { label: string; cls: string }> = {
  normal_wear_and_tear: { label: 'Normal wear and tear', cls: 'border-accent text-accent' },
  pre_existing: { label: 'Already there', cls: 'border-accent text-accent' },
  tenant_damage: { label: 'Your damage', cls: 'border-bad text-bad' },
  unclear: { label: 'Unclear', cls: 'border-warn text-warn' },
};

export function ClassPill({ value }: { value: string }) {
  const s = CLASS_STYLE[value] || CLASS_STYLE.unclear;
  return (
    <span
      className={`whitespace-nowrap rounded-full border bg-raised px-3 py-1 text-xs font-semibold uppercase tracking-widest ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function MockBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="chip border-warn text-warn" title="No API key for this service, so this is sample data">
      <WarningIcon size={14} weight="fill" aria-hidden />
      Sample data
    </span>
  );
}

export function ErrorNote({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-bad bg-raised px-3 py-2 text-base leading-relaxed text-bad"
    >
      {error}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const tones = { default: 'text-white', good: 'text-accent', bad: 'text-bad' } as const;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-3">
      <div className="label">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${tones[tone]}`}>{value}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-raised px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hover text-muted">
        {icon}
      </div>
      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-prose680 text-base leading-relaxed text-muted">{body}</p>
    </div>
  );
}
