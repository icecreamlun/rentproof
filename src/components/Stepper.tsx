'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';

const STEPS = [
  { key: 'contract', n: 1, label: 'Contract' },
  { key: 'move_in', n: 2, label: 'Move in' },
  { key: 'move_out', n: 3, label: 'Move out' },
  { key: 'dispute', n: 4, label: 'Fight back' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

export default function Stepper({
  active,
  done,
  onSelect,
}: {
  active: StepKey;
  done: Record<StepKey, boolean>;
  onSelect: (k: StepKey) => void;
}) {
  return (
    <nav aria-label="Case progress">
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((s) => {
          const isActive = s.key === active;
          const isDone = done[s.key];
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                onClick={() => onSelect(s.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold
                  transition-all duration-700 ease-fluid focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-accent
                  ${
                    isActive
                      ? 'border-lineStrong bg-hover text-white'
                      : 'border-line bg-raised text-muted hover:bg-hover hover:text-white'
                  }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                    ${isDone ? 'bg-accent text-ink' : isActive ? 'bg-lineStrong text-white' : 'bg-hover text-muted'}`}
                >
                  {isDone ? <CheckIcon size={12} weight="bold" aria-hidden /> : s.n}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
