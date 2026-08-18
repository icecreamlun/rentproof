'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import ArgueStep from '@/components/ArgueStep';
import ContractStep from '@/components/ContractStep';
import MoveInStep from '@/components/MoveInStep';
import MoveOutStep from '@/components/MoveOutStep';
import Reveal from '@/components/Reveal';
import Stepper, { StepKey } from '@/components/Stepper';
import TaglineReveal from '@/components/TaglineReveal';
import { api, getCaseId, resetCase } from '@/lib/client';
import { CaseFile } from '@/lib/types';
import { money } from '@/lib/util';

type Health = { services: Record<string, boolean> };

const SERVICE_LABEL: Record<string, string> = {
  gemini: 'Gemini',
  exa: 'Exa',
  apify: 'Apify',
  vapi: 'Vapi',
  elevenlabs: 'ElevenLabs',
  resend: 'Resend',
};

export default function Home() {
  const [caseId, setCaseId] = useState<string>('');
  const [data, setData] = useState<CaseFile | undefined>();
  const [step, setStep] = useState<StepKey>('contract');
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const id = getCaseId();
    setCaseId(id);
    // ?step= jumps straight to a stage, which keeps a live demo off the back foot.
    const forced = new URLSearchParams(window.location.search).get('step') as StepKey | null;
    void api<{ case: CaseFile }>(`/api/case/${id}`)
      .then((r) => {
        setData(r.case);
        if (forced) setStep(forced);
        else if (r.case.comparison) setStep('dispute');
        else if (r.case.moveIn) setStep('move_out');
        else if (r.case.contract) setStep('move_in');
      })
      .catch(() => {});
    void api<Health>('/api/health')
      .then(setHealth)
      .catch(() => {});
  }, []);

  const done: Record<StepKey, boolean> = {
    contract: Boolean(data?.contract),
    move_in: Boolean(data?.moveIn),
    move_out: Boolean(data?.comparison),
    dispute: Boolean(data?.letter || data?.callLog?.length),
  };

  function advance(next: StepKey) {
    return (c: CaseFile) => {
      setData(c);
      setStep(next);
    };
  }

  async function seedDemo() {
    const r = await api<{ case: CaseFile }>('/api/demo/seed', { caseId });
    setData(r.case);
    setStep('dispute');
  }

  const owed = data?.comparison?.unlawfullyWithheld;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-base font-bold text-ink"
            aria-hidden
          >
            R
          </span>
          <span className="text-base font-semibold tracking-tight text-white">RentProof</span>
        </div>
        <nav aria-label="Case actions" className="flex items-center gap-2">
          <button onClick={() => void seedDemo()} className="btn-ghost btn-sm">
            Load demo case
          </button>
          <button
            onClick={() => {
              const id = resetCase();
              setCaseId(id);
              setData(undefined);
              setStep('contract');
            }}
            className="btn-ghost btn-sm"
          >
            New case
          </button>
        </nav>
      </header>

      <section className="py-20" aria-labelledby="hero-heading">
        <h1
          id="hero-heading"
          className="max-w-prose680 bg-gradient-to-r from-white to-[#9B9B9B] bg-clip-text text-4xl
                     font-semibold leading-tight tracking-tight text-transparent sm:text-5xl"
        >
          Get your deposit back
          <br />
          without the fight you dread
        </h1>
        <p className="mt-6 max-w-prose680 text-lg leading-relaxed text-muted">
          Photograph the place on day one. Photograph it on the last. When they keep your money,
          RentProof compares the two sets frame by frame, quotes the statute that says they cannot,
          and phones the landlord for you.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a href="#case" className="btn-primary">
            Start my case
            <ArrowDownIcon size={16} weight="bold" aria-hidden />
          </a>
          {owed != null && owed > 0 ? (
            <span className="chip border-accent text-accent">
              {money(owed, data?.contract?.currency)} owed to you on this case
            </span>
          ) : (
            <span className="chip">Works for apartments, cars and gear</span>
          )}
        </div>

        {health && (
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Connected services">
            {Object.entries(health.services).map(([k, live]) => (
              <li key={k}>
                <span
                  className={`chip ${live ? 'border-accent text-accent' : ''}`}
                  title={live ? 'Live' : 'No key yet, so this step shows sample data'}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${live ? 'bg-accent' : 'bg-muted'}`}
                    aria-hidden
                  />
                  {SERVICE_LABEL[k] || k}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <main id="case" className="scroll-mt-6">
        <div className="mb-6">
          <Stepper active={step} done={done} onSelect={setStep} />
        </div>

        {step === 'contract' && <ContractStep caseId={caseId} data={data} onDone={advance('move_in')} />}
        {step === 'move_in' && <MoveInStep caseId={caseId} data={data} onDone={setData} />}
        {step === 'move_out' && <MoveOutStep caseId={caseId} data={data} onDone={advance('dispute')} />}
        {step === 'dispute' && <ArgueStep caseId={caseId} data={data} onDone={setData} />}

        {step === 'move_in' && done.move_in && (
          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep('move_out')} className="btn-primary">
              I am moving out
            </button>
          </div>
        )}
      </main>

      <TaglineReveal />

      <Reveal>
        <footer className="pt-6">
          <div className="divider" />
          <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-prose680">
              <p className="font-mono text-sm text-muted">case {caseId}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                RentProof is not a law firm and nothing here is legal advice. Outbound calls open by
                stating that they are placed by an AI and that the call is recorded.
              </p>
            </div>
            <nav aria-label="Legal" className="flex gap-4">
              <Link href="/privacy" className="btn-link">
                Privacy
              </Link>
              <Link href="/terms" className="btn-link">
                Terms
              </Link>
            </nav>
          </div>
        </footer>
      </Reveal>
    </div>
  );
}
