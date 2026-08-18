'use client';

import { ReactNode, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  // Without a deployment the app still runs, it just loses the live timeline.
  if (!client) return <>{children}</>;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
