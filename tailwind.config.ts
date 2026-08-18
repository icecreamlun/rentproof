import type { Config } from 'tailwindcss';

/**
 * Palette is locked to the design system's approved dark surfaces.
 * Nothing outside this list may be used as a background.
 */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: '#000000',
        ink: '#000000',
        surface: '#181818',
        raised: '#1F1F1F',
        hover: '#272727',
        line: '#272727',
        lineStrong: '#313131',
        muted: '#9B9B9B',
        accent: '#4ADE80',
        warn: '#FBBF24',
        bad: '#F87171',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.32,0.72,0,1)',
      },
      maxWidth: {
        prose680: '680px',
      },
    },
  },
  plugins: [],
} satisfies Config;
