import Link from 'next/link';

export const metadata = { title: 'Privacy — RentProof' };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-prose680 px-4 py-20">
      <Link href="/" className="btn-link">
        Back to your case
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-white">Privacy</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
        <p>
          Your photos, contract and answers are stored against a random case id held in your browser.
          There is no account and no email address is required to use the tool.
        </p>
        <p>
          To analyse a case we send your photos and contract text to Google Gemini, search queries to
          Exa, page fetches to Apify, and, if you place one, the case brief to Vapi so the agent can
          speak from it. Nothing is sold or used for advertising.
        </p>
        <p>
          Choosing New case detaches you from the previous case id. Ask us to delete a case and we
          remove the stored file.
        </p>
      </div>
    </main>
  );
}
