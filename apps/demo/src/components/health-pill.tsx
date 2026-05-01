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
        // /v1/health is a public endpoint on api.repull.dev — the demo proxy
        // forwards it without an API key. No sandbox key needed.
        const client = makeClient();
        const data = await client.health.check();
        if (!mounted) return;
        setState({ status: 'ok', data });
      } catch {
        if (!mounted) return;
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
