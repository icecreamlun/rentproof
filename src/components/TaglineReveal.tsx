'use client';

import { useEffect, useRef, useState } from 'react';

const LINES = [
  'Almost nobody argues the deduction.',
  'It takes evidence you never took,',
  'a statute you never read,',
  'and a call you dread making.',
  'RentProof brings all three.',
];

const WORDS = LINES.join(' \n ').split(' ');

/**
 * Words activate one at a time in reading order as the block crosses the
 * trigger line. One observer per word, per the design system.
 */
export default function TaglineReveal() {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lit, setLit] = useState<number>(-1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLit(WORDS.length);
      return;
    }
    const observers = refs.current.map((el, i) => {
      if (!el) return null;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setLit((current) => Math.max(current, i));
        },
        { rootMargin: '0px 0px -45% 0px', threshold: 0 },
      );
      io.observe(el);
      return io;
    });
    return () => observers.forEach((io) => io?.disconnect());
  }, []);

  return (
    <section className="py-24" aria-label="Why this exists">
      <p className="mx-auto max-w-prose680 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {WORDS.map((word, i) => {
          const isBreak = word === '\n';
          if (isBreak) return <br key={i} />;
          return (
            <span
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={`transition-colors duration-700 ease-fluid ${
                i <= lit ? 'text-white' : 'text-white/30'
              }`}
            >
              {word}{' '}
            </span>
          );
        })}
      </p>
    </section>
  );
}
