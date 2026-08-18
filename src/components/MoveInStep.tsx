'use client';

import { useState } from 'react';
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { ImagesIcon } from '@phosphor-icons/react/dist/ssr/Images';
import { LockKeyIcon } from '@phosphor-icons/react/dist/ssr/LockKey';
import Dropzone from './Dropzone';
import Reveal from './Reveal';
import { Dots, EmptyState, ErrorNote, MockBadge, ResultSkeleton, Section } from './ui';
import { api } from '@/lib/client';
import { CaseFile, PhotoInventory, Severity } from '@/lib/types';

const SEV: Record<Severity, string> = {
  none: 'text-muted',
  minor: 'text-accent',
  moderate: 'text-warn',
  severe: 'text-bad',
};

export default function MoveInStep({
  caseId,
  data,
  onDone,
}: {
  caseId: string;
  data?: CaseFile;
  onDone: (c: CaseFile) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState(false);
  const inv = data?.moveIn;

  async function run() {
    if (!photos.length) {
      setError('Add at least one photo before building the record.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ inventory: PhotoInventory; case: CaseFile; mock?: boolean }>(
        '/api/photos/analyze',
        { caseId, photos },
      );
      setMock(Boolean(r.mock));
      setPhotos([]);
      onDone(r.case);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswers(skip = false) {
    const res = await fetch(`/api/case/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: skip ? {} : answers, stage: 'occupancy' }),
    });
    const json = (await res.json()) as { case?: CaseFile };
    setSavedAnswers(true);
    if (json.case) onDone(json.case);
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <Section
          title="Photograph it on day one"
          hint="Shoot every surface you could later be blamed for. Whatever you miss today is a deduction you cannot disprove eleven months from now."
          right={<span className="chip">{data?.moveInPhotos.length || 0} on file</span>}
        >
          <Dropzone label="Drop your day one photos" values={photos} onChange={setPhotos} />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button onClick={() => void run()} disabled={busy || !photos.length} className="btn-primary">
              <ImagesIcon size={16} weight="bold" aria-hidden />
              {busy ? <Dots label="Building the condition record" /> : 'Build condition record'}
            </button>
            <span className="text-sm text-muted">Gemini vision logs every defect that is already there</span>
          </div>
          <ErrorNote error={error} />
        </Section>
      </Reveal>

      {busy && !inv && <ResultSkeleton rows={4} />}

      {!busy && !inv && (
        <Reveal>
          <EmptyState
            icon={<ClipboardTextIcon size={24} aria-hidden />}
            title="No condition record yet"
            body="Once you upload, every scuff, chip and stain gets written down with its exact location. That list is what wins the argument later."
          />
        </Reveal>
      )}

      {inv && (
        <Reveal>
          <Section title="Condition record" hint={inv.summary} right={<MockBadge show={mock} />}>
            <ul className="space-y-2">
              {inv.findings.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-4 rounded-xl border border-line bg-raised px-4 py-3"
                >
                  <span className={`mt-2 text-lg leading-none ${SEV[f.severity]}`} aria-hidden>
                    ·
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{f.area}</p>
                    <p className="mt-1 max-w-prose680 text-base leading-relaxed text-white">{f.condition}</p>
                    <p className="mt-2 max-w-prose680 text-sm leading-relaxed text-muted">{f.note}</p>
                  </div>
                </li>
              ))}
            </ul>

            {inv.coverageGaps?.length > 0 && (
              <div className="mt-6 rounded-xl border border-line bg-raised p-4">
                <h3 className="label text-warn">Still missing</h3>
                <ul className="mt-3 space-y-2">
                  {inv.coverageGaps.map((g, i) => (
                    <li key={i} className="text-base leading-relaxed text-white">
                      · {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inv.questions?.length > 0 && !savedAnswers && (
              <div className="mt-6 rounded-xl border border-line bg-raised p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="label">A few questions, these change the outcome</h3>
                  <button onClick={() => void saveAnswers(true)} className="btn-link">
                    Skip
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {inv.questions.map((q, i) => (
                    <div key={i}>
                      <label htmlFor={`q-${i}`} className="block text-base leading-relaxed text-white">
                        {q}
                      </label>
                      <input
                        id={`q-${i}`}
                        className="input mt-2"
                        value={answers[q] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  ))}
                </div>
                <button onClick={() => void saveAnswers()} className="btn-ghost mt-4">
                  Save answers
                </button>
              </div>
            )}

            {savedAnswers && (
              <p className="mt-6 flex items-center gap-2 text-base text-accent">
                <LockKeyIcon size={16} weight="bold" aria-hidden />
                Record sealed. Come back the day you move out, we keep everything.
              </p>
            )}
          </Section>
        </Reveal>
      )}
    </div>
  );
}
