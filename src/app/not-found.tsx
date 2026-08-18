import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-prose680 flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
        There is nothing filed here
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        The page you asked for does not exist. Your case is still saved, so nothing is lost.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Back to your case
      </Link>
    </main>
  );
}
