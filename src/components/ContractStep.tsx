'use client';

import { useState } from 'react';
import { ScalesIcon } from '@phosphor-icons/react/dist/ssr/Scales';
import { CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import Dropzone from './Dropzone';
import Reveal from './Reveal';
import { Dots, ErrorNote, MockBadge, ResultSkeleton, RiskPill, Section, Stat } from './ui';
import { api } from '@/lib/client';
import { CaseFile, ContractAnalysis } from '@/lib/types';
import { money } from '@/lib/util';

export default function ContractStep({
  caseId,
  data,
  onDone,
}: {
  caseId: string;
  data?: CaseFile;
  onDone: (c: CaseFile) => void;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contract = data?.contract;
  const ready = files.length > 0 || text.trim().length >= 40;

  async function run() {
    if (!ready) {
      setError('Add the contract file, or paste at least a paragraph of the text.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ contract: ContractAnalysis; case: CaseFile; mock?: boolean }>(
        '/api/contract/analyze',
        { caseId, contractText: text, files },
      );
      setMock(Boolean(r.mock));
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
          title="Upload the agreement"
          hint="Lease, car hire, equipment rental, anything with a deposit. We read it before you sign anything away and tell you which clauses are going to cost you later."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Dropzone
              label="Drop the contract"
              accept="application/pdf,image/*"
              values={files}
              onChange={setFiles}
            />
            <div>
              <label htmlFor="contract-text" className="label mb-2 block">
                Or paste the text
              </label>
              <textarea
                id="contract-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste the lease text here if the file is not handy"
                className="input resize-none font-mono text-sm leading-relaxed"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button onClick={() => void run()} disabled={busy || !ready} className="btn-primary">
              <ScalesIcon size={16} weight="bold" aria-hidden />
              {busy ? <Dots label="Reading the fine print" /> : 'Analyse contract'}
            </button>
            <span className="text-sm text-muted">Gemini reads it the way a tenant side attorney would</span>
          </div>

          <ErrorNote error={error} />
        </Section>
      </Reveal>

      {busy && !contract && <ResultSkeleton rows={3} />}

      {contract && (
        <Reveal>
          <Section
            title="What we found"
            hint={contract.summary}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <MockBadge show={mock} />
                <span className="chip">{contract.jurisdiction}</span>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Deposit at risk" value={money(contract.depositAmount, contract.currency)} />
              <Stat label="Monthly rent" value={money(contract.monthlyRent, contract.currency)} />
              <Stat
                label="Legal return window"
                value={contract.returnWindowDays ? `${contract.returnWindowDays} days` : 'Unknown'}
              />
              <Stat
                label="Contract risk"
                value={`${contract.overallRiskScore} of 100`}
                tone={contract.overallRiskScore > 60 ? 'bad' : 'default'}
              />
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="label">Clauses worth fighting</h3>
              {contract.redFlags.map((f, i) => (
                <article key={i} className="rounded-xl border border-line bg-raised p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <blockquote className="max-w-prose680 text-base leading-relaxed text-white">
                      “{f.clause}”
                    </blockquote>
                    <RiskPill risk={f.risk} />
                  </div>
                  <p className="mt-3 max-w-prose680 text-base leading-relaxed text-muted">{f.issue}</p>
                  {f.lawNote && <p className="mt-2 font-mono text-sm text-accent">{f.lawNote}</p>}
                  {f.suggestedPushback && (
                    <p className="mt-2 max-w-prose680 text-sm leading-relaxed text-muted">
                      <span className="font-semibold text-white">Ask for: </span>
                      {f.suggestedPushback}
                    </p>
                  )}
                </article>
              ))}
            </div>

            {contract.photoChecklist?.length > 0 && (
              <div className="mt-6 rounded-xl border border-line bg-raised p-4">
                <h3 className="label flex items-center gap-2 text-accent">
                  <CameraIcon size={14} weight="bold" aria-hidden />
                  Photograph these before you move in
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {contract.photoChecklist.map((c, i) => (
                    <li key={i} className="flex gap-2 text-base leading-relaxed text-white">
                      <span className="text-accent" aria-hidden>
                        ·
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        </Reveal>
      )}
    </div>
  );
}
