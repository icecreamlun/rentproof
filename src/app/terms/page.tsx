import Link from 'next/link';

export const metadata = { title: 'Terms — RentProof' };

export default function Terms() {
  return (
    <main className="mx-auto max-w-prose680 px-4 py-20">
      <Link href="/" className="btn-link">
        Back to your case
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-white">Terms</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
        <p>
          RentProof is not a law firm and does not provide legal advice. Assessments and letters are
          drafted by a model and should be read before you send them.
        </p>
        <p>
          You are responsible for the phone number you enter. Only call a party you are actually in a
          dispute with. Calls announce that they are placed by an AI and that they are recorded, which
          is a requirement in two party consent jurisdictions.
        </p>
        <p>The tool is provided as is, without warranty, for the duration of this prototype.</p>
      </div>
    </main>
  );
}
