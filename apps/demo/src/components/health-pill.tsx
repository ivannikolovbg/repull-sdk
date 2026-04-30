'use client';

import { useEffect, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { HealthResponse } from '@repull/sdk';

export function HealthPill() {
  const [state, setState] = useState<{ status: 'idle' | 'ok' | 'down' | 'loading'; data?: HealthResponse }>({
    status: 'idle',
  });

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      setState((s) => (s.status === 'idle' ? { status: 'loading' } : s));
      try {
        // Health doesn't need a key, but pass sandbox so the proxy is happy
        // even on a fresh visitor.
        const client = makeClient({ useSandbox: true });
        const data = await client.health.check();
        if (!mounted) return;
        setState({ status: 'ok', data });
      } catch {
        if (!mounted) return;
        // Even without a key, /v1/health on api.repull.dev is public, so try direct.
        try {
          const r = await fetch('https://api.repull.dev/v1/health', { mode: 'cors' });
          if (r.ok) {
            const data = (await r.json()) as HealthResponse;
            if (mounted) setState({ status: 'ok', data });
            return;
          }
        } catch { /* fall through */ }
        setState({ status: 'down' });
      }
    }

    tick();
    timer = setInterval(tick, 15_000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const ok = state.status === 'ok';
  const color = ok ? '#3ecf8e' : state.status === 'down' ? '#ff5a5a' : '#888';
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
      title={state.data ? `service ${state.data.service} v${state.data.version}` : 'api.repull.dev'}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: ok ? `0 0 10px ${color}` : 'none' }}
      />
      <span className="text-xs font-mono">api.repull.dev</span>
      <span className="text-xs uppercase tracking-wide" style={{ color }}>
        {ok ? 'ok' : state.status === 'down' ? 'down' : '…'}
      </span>
    </div>
  );
}
