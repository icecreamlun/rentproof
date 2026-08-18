'use client';

import { useState } from 'react';
import { BooksIcon } from '@phosphor-icons/react/dist/ssr/Books';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { PhoneCallIcon } from '@phosphor-icons/react/dist/ssr/PhoneCall';
import { SpeakerHighIcon } from '@phosphor-icons/react/dist/ssr/SpeakerHigh';
import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import LiveTimeline from './LiveTimeline';
import Reveal from './Reveal';
import { Dots, EmptyState, ErrorNote, MockBadge, Section } from './ui';
import { api } from '@/lib/client';
import { CaseFile, DemandLetter, LandlordIntel, LawCitation } from '@/lib/types';
import { money } from '@/lib/util';

const LANGS = [
  ['en', 'English'],
  ['zh', '中文'],
  ['es', 'Español'],
  ['hi', 'हिन्दी'],
  ['tl', 'Tagalog'],
  ['vi', 'Tiếng Việt'],
] as const;

export default function ArgueStep({
  caseId,
  data,
  onDone,
}: {
  caseId: string;
  data?: CaseFile;
  onDone: (c: CaseFile) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [mocks, setMocks] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState(data?.contract?.parties?.landlordPhone || '');
  const [email, setEmail] = useState(data?.contract?.parties?.landlordEmail || '');
  const [tone, setTone] = useState<'friendly' | 'firm' | 'final_notice'>('firm');
  const [lang, setLang] = useState('en');
  const [audio, setAudio] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cur = data?.contract?.currency || 'USD';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^\+\d{8,15}$/.test(phone.replace(/[^\d+]/g, ''));

  async function guarded<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError({ key, message: (e as Error).message });
      return null;
    } finally {
      setBusy(null);
    }
  }

  const research = () =>
    guarded('law', async () => {
      const r = await api<{ citations: LawCitation[]; case: CaseFile; mock?: boolean }>(
        '/api/law/research',
        { caseId },
      );
      setMocks((m) => ({ ...m, law: Boolean(r.mock) }));
      onDone(r.case);
    });

  const lookup = () =>
    guarded('landlord', async () => {
      const r = await api<{ intel: LandlordIntel; case: CaseFile; mock?: boolean }>('/api/landlord/lookup', {
        caseId,
      });
      setMocks((m) => ({ ...m, landlord: Boolean(r.mock) }));
      onDone(r.case);
    });

  const draft = () =>
    guarded('letter', async () => {
      const r = await api<{ letter: DemandLetter; case: CaseFile; mock?: boolean }>('/api/argue/letter', {
        caseId,
        tone,
      });
      setMocks((m) => ({ ...m, letter: Boolean(r.mock) }));
      onDone(r.case);
    });

  const send = () =>
    guarded('email', async () => {
      const r = await api<{ id?: string; mailto?: string; to: string; mock?: boolean }>('/api/argue/email', {
        caseId,
        to: email,
      });
      if (r.mailto) {
        window.location.href = r.mailto;
        setEmailStatus(`Opened your mail client, addressed to ${r.to}`);
      } else {
        setEmailStatus(`Sent to ${r.to}, reference ${r.id}`);
      }
    });

  const call = () =>
    guarded('call', async () => {
      const r = await api<{ call: { id: string; status: string }; mock?: boolean; note?: string }>(
        '/api/argue/call',
        { caseId, to: phone },
      );
      setCallStatus(
        r.mock ? `Simulated. ${r.note}` : `Dialling ${phone}, call ${r.call.id}, ${r.call.status}`,
      );
    });

  const brief = () =>
    guarded('voice', async () => {
      const r = await api<{ audio?: string; script: string; mock?: boolean }>('/api/voice/brief', {
        caseId,
        language: lang,
      });
      setScript(r.script);
      setAudio(r.audio || null);
      setMocks((m) => ({ ...m, voice: Boolean(r.mock) }));
    });

  return (
    <div className="space-y-6">
      <Reveal>
        <LiveTimeline caseId={caseId} phone={phone} />
      </Reveal>

      <Reveal>
        <Section
          title="Build the argument"
          hint="Find the statute that actually applies, quote it word for word, and check whether this landlord has done the same thing to other people."
        >
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void research()} disabled={busy === 'law'} className="btn-ghost">
              <BooksIcon size={16} weight="bold" aria-hidden />
              {busy === 'law' ? <Dots label="Reading the statute" /> : 'Research the law'}
            </button>
            <button onClick={() => void lookup()} disabled={busy === 'landlord'} className="btn-ghost">
              <MagnifyingGlassIcon size={16} weight="bold" aria-hidden />
              {busy === 'landlord' ? <Dots label="Sweeping public records" /> : 'Check this landlord'}
            </button>
          </div>

          {!data?.citations?.length && busy !== 'law' && (
            <div className="mt-6">
              <EmptyState
                icon={<BooksIcon size={24} aria-hidden />}
                title="No citations on file yet"
                body="Exa finds the governing statute, Apify pulls its full text, and Gemini reduces it to lines you can quote out loud. Nothing is recalled from memory."
              />
            </div>
          )}

          {data?.citations?.length ? (
            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="label">Citations on file</h3>
                <MockBadge show={mocks.law} />
              </div>
              {data.citations.map((c, i) => (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-line bg-raised p-4 transition-all duration-700
                             ease-fluid hover:bg-hover focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-accent"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-accent">
                      {c.citation || c.title}
                    </span>
                    <span className="label">{c.source}</span>
                  </div>
                  <p className="mt-2 max-w-prose680 text-base leading-relaxed text-white">“{c.snippet}”</p>
                </a>
              ))}
            </div>
          ) : null}

          {data?.landlordIntel && (
            <div className="mt-6 rounded-xl border border-line bg-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="label text-warn">
                  {data.landlordIntel.complaintCount} public deposit complaints · {data.landlordIntel.name}
                </h3>
                <MockBadge show={mocks.landlord} />
              </div>
              <ul className="mt-4 space-y-2">
                {data.landlordIntel.signals.map((s, i) => (
                  <li key={i} className="max-w-prose680 text-base leading-relaxed text-white">
                    <span className="font-mono text-sm text-muted">{s.source}</span> {s.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ErrorNote error={['law', 'landlord'].includes(error?.key || '') ? error?.message : null} />
        </Section>
      </Reveal>

      <Reveal>
        <Section
          title="Send the demand letter"
          hint="Itemised, statute quoted, and it concedes what you genuinely owe. That concession is exactly why the rest of it gets paid."
        >
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="tone" className="sr-only">
              Letter tone
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as typeof tone)}
              className="input w-auto"
            >
              <option value="friendly">Friendly</option>
              <option value="firm">Firm</option>
              <option value="final_notice">Final notice before small claims</option>
            </select>
            <button onClick={() => void draft()} disabled={busy === 'letter'} className="btn-primary">
              <PencilSimpleIcon size={16} weight="bold" aria-hidden />
              {busy === 'letter' ? <Dots label="Drafting" /> : 'Draft letter'}
            </button>
            <MockBadge show={mocks.letter} />
          </div>

          {data?.letter && (
            <>
              <div className="mt-6 overflow-hidden rounded-xl border border-line">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-hover px-4 py-3">
                  <h3 className="text-base font-semibold text-white">{data.letter.subject}</h3>
                  <span className="font-mono text-sm text-accent">
                    {money(data.letter.demandAmount, cur)} · {data.letter.deadlineDays} days
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap bg-raised px-4 py-4 font-sans text-base leading-relaxed text-white">
                  {data.letter.body}
                </pre>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label htmlFor="landlord-email" className="sr-only">
                  Landlord email
                </label>
                <input
                  id="landlord-email"
                  type="email"
                  className="input w-64"
                  placeholder="billing@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={email.length > 0 && !emailValid}
                />
                <button
                  onClick={() => void send()}
                  disabled={busy === 'email' || !emailValid}
                  className="btn-ghost"
                >
                  <EnvelopeSimpleIcon size={16} weight="bold" aria-hidden />
                  {busy === 'email' ? <Dots label="Sending" /> : 'Send email'}
                </button>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(data.letter!.body);
                    setCopied(true);
                  }}
                  className="btn-ghost"
                >
                  <CopyIcon size={16} weight="bold" aria-hidden />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {email.length > 0 && !emailValid && (
                <p className="mt-2 text-sm text-bad">That does not look like an email address.</p>
              )}
              {emailStatus && <p className="mt-2 text-sm text-accent">{emailStatus}</p>}
            </>
          )}
          <ErrorNote error={['letter', 'email'].includes(error?.key || '') ? error?.message : null} />
        </Section>
      </Reveal>

      <Reveal>
        <Section
          title="Let it make the call"
          hint="No reply to the letter? The agent phones them with the whole case brief loaded, photo evidence, statute and the number. It opens by saying it is an AI and that the call is recorded."
        >
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="landlord-phone" className="sr-only">
              Landlord phone number
            </label>
            <input
              id="landlord-phone"
              type="tel"
              className="input w-56 font-mono"
              placeholder="+14158023379"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={phone.length > 0 && !phoneValid}
            />
            <button onClick={() => void call()} disabled={busy === 'call' || !phoneValid} className="btn-primary">
              <PhoneCallIcon size={16} weight="bold" aria-hidden />
              {busy === 'call' ? <Dots label="Connecting" /> : 'Call the landlord'}
            </button>
          </div>
          {phone.length > 0 && !phoneValid && (
            <p className="mt-2 text-sm text-bad">
              Use the international format, country code first, digits only after the plus.
            </p>
          )}
          {callStatus && (
            <p className="mt-4 rounded-xl border border-line bg-raised px-4 py-3 text-base text-accent">
              {callStatus}
            </p>
          )}
          <ErrorNote error={error?.key === 'call' ? error.message : null} />
          {data?.callLog?.length ? (
            <ul className="mt-4 space-y-2">
              {data.callLog.map((c) => (
                <li key={c.id} className="font-mono text-sm text-muted">
                  {new Date(c.startedAt).toLocaleTimeString()} · {c.to} · {c.status}
                  {c.mock ? ' · simulated' : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      </Reveal>

      <Reveal>
        <Section
          title="Hear your case in your language"
          hint="The renters who lose the most deposit money are the ones who cannot read six pages of English lease law. So we say it out loud instead."
        >
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="lang" className="sr-only">
              Language
            </label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="input w-auto">
              {LANGS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <button onClick={() => void brief()} disabled={busy === 'voice'} className="btn-ghost">
              <SpeakerHighIcon size={16} weight="bold" aria-hidden />
              {busy === 'voice' ? <Dots label="Generating" /> : 'Generate audio brief'}
            </button>
            <MockBadge show={mocks.voice} />
          </div>
          <ErrorNote error={error?.key === 'voice' ? error.message : null} />
          {audio && <audio controls src={audio} className="mt-4 w-full" />}
          {script && (
            <p className="mt-4 max-w-prose680 rounded-xl border border-line bg-raised p-4 text-base leading-relaxed text-white">
              {script}
            </p>
          )}
        </Section>
      </Reveal>
    </div>
  );
}
