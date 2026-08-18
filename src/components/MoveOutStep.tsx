'use client';

import { useState } from 'react';
import { ScalesIcon } from '@phosphor-icons/react/dist/ssr/Scales';
import Dropzone from './Dropzone';
import Reveal from './Reveal';
import { ClassPill, Dots, ErrorNote, MockBadge, ResultSkeleton, Section, Stat } from './ui';
import { api } from '@/lib/client';
import { CaseFile, ComparisonResult } from '@/lib/types';
import { money } from '@/lib/util';

export default function MoveOutStep({
  caseId,
  data,
  onDone,
}: {
  caseId: string;
  data?: CaseFile;
  onDone: (c: CaseFile) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [claimed, setClaimed] = useState<string>(
    data?.claimedDeduction != null ? String(data.claimedDeduction) : '',
  );
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cmp = data?.comparison;
  const cur = data?.contract?.currency || 'USD';

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ comparison: ComparisonResult; case: CaseFile; mock?: boolean }>('/api/compare', {
        caseId,
        photos,
        claimedDeduction: claimed ? Number(claimed) : null,
        landlordStatement: statement,
      });
      setMock(Boolean(r.mock));
      setPhotos([]);
      onDone(r.case);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <Section
          title="The day you leave, and what they charged"
          hint="Same angles as before, plus their itemised statement. We compare the two sets frame by frame and price every line."
          right={<span className="chip">{data?.moveInPhotos.length || 0} day one photos on file</span>}
        >
          <Dropzone label="Drop your final photos" values={photos} onChange={setPhotos} />

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div>
              <label htmlFor="claimed" className="label mb-2 block">
                Amount they withheld
              </label>
              <input
                id="claimed"
                className="input tabular-nums"
                inputMode="decimal"
                placeholder="2284"
                value={claimed}
                onChange={(e) => setClaimed(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="statement" className="label mb-2 block">
                Their itemised statement, pasted
              </label>
              <textarea
                id="statement"
                rows={4}
                className="input resize-none font-mono text-sm leading-relaxed"
                placeholder={'Carpet cleaning 812\nWall repair 397\nCleaning fee 435'}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button onClick={() => void run()} disabled={busy} className="btn-primary">
              <ScalesIcon size={16} weight="bold" aria-hidden />
              {busy ? <Dots label="Comparing every frame" /> : 'Compare and price the damage'}
            </button>
            <span className="text-sm text-muted">
              Wear and tear is not chargeable, and we prove which is which
            </span>
          </div>
          <ErrorNote error={error} />
        </Section>
      </Reveal>

      {busy && !cmp && <ResultSkeleton rows={4} />}

      {cmp && (
        <Reveal>
          <Section title="Verdict" hint={cmp.summary} right={<MockBadge show={mock} />}>
            <div className="rounded-xl border border-line bg-raised px-6 py-8 text-center">
              <p className="label text-accent">Unlawfully withheld</p>
              <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight text-accent">
                {money(cmp.unlawfullyWithheld, cur)}
              </p>
              <p className="mx-auto mt-4 max-w-prose680 text-base leading-relaxed text-white">
                {cmp.headline}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="They kept" value={money(cmp.claimedDeduction, cur)} tone="bad" />
              <Stat label="Actually defensible" value={money(cmp.totalFairCharge, cur)} />
              <Stat label="You should get back" value={money(cmp.unlawfullyWithheld, cur)} tone="good" />
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="label">Line by line</h3>
              {cmp.deltas.map((d, i) => (
                <article key={i} className="rounded-xl border border-line bg-raised p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="min-w-0 flex-1 text-base font-semibold text-white">{d.area}</h4>
                    <div className="flex shrink-0 items-center gap-3">
                      <ClassPill value={d.classification} />
                      <span
                        className={`font-mono text-base tabular-nums ${
                          d.fairChargeUsd > 0 ? 'text-bad' : 'text-accent'
                        }`}
                      >
                        {money(d.fairChargeUsd, cur)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-surface px-3 py-2">
                      <p className="label">Day one</p>
                      <p className="mt-2 text-sm leading-relaxed text-white">{d.before}</p>
                    </div>
                    <div className="rounded-lg border border-line bg-surface px-3 py-2">
                      <p className="label">Final day</p>
                      <p className="mt-2 text-sm leading-relaxed text-white">{d.after}</p>
                    </div>
                  </div>
                  <p className="mt-4 max-w-prose680 text-base leading-relaxed text-white">{d.reasoning}</p>
                  <p className="mt-2 font-mono text-sm text-muted">
                    confidence {(d.confidence * 100).toFixed(0)} percent
                  </p>
                </article>
              ))}
            </div>
          </Section>
        </Reveal>
      )}
    </div>
  );
}
