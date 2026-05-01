'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import { CodePanel, type CodeSnippet } from './code-panel';
import type { AuthState } from './auth-bar';
import type { ConnectSession, ConnectStatus, AirbnbAccessType } from '@repull/sdk';

interface FlowState {
  phase: 'idle' | 'creating' | 'awaiting' | 'connected' | 'error';
  session?: ConnectSession;
  status?: ConnectStatus;
  error?: string;
}

export function ConnectAirbnb({ auth }: { auth: AuthState }) {
  const [accessType, setAccessType] = useState<AirbnbAccessType>('full_access');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [flow, setFlow] = useState<FlowState>({ phase: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Default the redirectUrl to this demo's /airbnb-redirect route so users
  // can see the full round-trip.
  useEffect(() => {
    if (!redirectUrl && typeof window !== 'undefined') {
      setRedirectUrl(`${window.location.origin}/airbnb-redirect`);
    }
  }, [redirectUrl]);

  const ready = Boolean(auth.apiKey || auth.useSandbox);

  // Live status polling once a session exists.
  useEffect(() => {
    if (!ready || flow.phase !== 'awaiting') return;
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });

    async function pollOnce() {
      try {
        const status = await client.connect.airbnb.status();
        setFlow((prev) => {
          if (prev.phase !== 'awaiting') return prev;
          const connected = Boolean(status?.connected);
          return connected ? { ...prev, phase: 'connected', status } : { ...prev, status };
        });
      } catch {
        // Network errors during polling are non-fatal; ignore.
      }
    }
    pollOnce();
    pollRef.current = setInterval(pollOnce, 5_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [auth.apiKey, auth.useSandbox, ready, flow.phase]);

  async function createSession() {
    if (!ready) {
      setFlow({ phase: 'error', error: 'Add a Repull API key (or click "Use sandbox") above first.' });
      return;
    }
    setFlow({ phase: 'creating' });
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    try {
      const session = await client.connect.airbnb.create({
        redirectUrl: redirectUrl.trim(),
        accessType,
      });
      setFlow({ phase: 'awaiting', session });
    } catch (err) {
      setFlow({ phase: 'error', error: (err as Error).message ?? 'Unknown error' });
    }
  }

  async function disconnect() {
    if (!ready) return;
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    try {
      await client.connect.airbnb.disconnect();
      setFlow({ phase: 'idle' });
    } catch (err) {
      setFlow((prev) => ({ ...prev, error: (err as Error).message ?? 'Failed to disconnect' }));
    }
  }

  const snippets = useMemo<CodeSnippet[]>(() => {
    const ts = `import { Repull } from '@repull/sdk';

const repull = new Repull({ apiKey: process.env.REPULL_API_KEY });

const session = await repull.connect.airbnb.create({
  redirectUrl: ${JSON.stringify(redirectUrl || 'https://yourapp.com/airbnb/return')},
  accessType: ${JSON.stringify(accessType)},
});

// session.oauthUrl  -> send the user here
// session.sessionId -> poll status with repull.connect.airbnb.status()
// session.expiresAt -> ISO timestamp
`;
    const curl = `curl -X POST https://api.repull.dev/v1/connect/airbnb \\
  -H 'Authorization: Bearer $REPULL_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({
    redirectUrl: redirectUrl || 'https://yourapp.com/airbnb/return',
    accessType,
  })}'`;
    return [
      { label: 'TS', language: 'ts', code: ts },
      { label: 'curl', language: 'curl', code: curl },
    ];
  }, [accessType, redirectUrl]);

  const session = flow.session;

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
        <span className="inline-block w-1.5 h-5 rounded-full bg-gradient-to-b from-[#ff5757] to-[#ff7a2b]" />
        <div>
          <h2 className="section-h2">Airbnb OAuth Connect</h2>
          <p className="text-xs muted mt-0.5">Flagship flow. Live against api.repull.dev.</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-px bg-white/[0.04]">
        {/* LEFT — controls + status */}
        <div className="bg-[#0b0b0b] p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-white/45">Access type</label>
            <div className="flex gap-2">
              {(['full_access', 'read_only'] as AirbnbAccessType[]).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setAccessType(opt)}
                  className="btn"
                  style={{
                    background: accessType === opt ? 'rgba(255,122,43,0.15)' : 'rgba(255,255,255,0.04)',
                    borderColor: accessType === opt ? 'rgba(255,122,43,0.55)' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {opt === 'full_access' ? 'Full access' : 'Read-only'}
                </button>
              ))}
            </div>
            <p className="text-xs muted">
              {accessType === 'full_access'
                ? 'Read all data, send messages, manage listings (pricing, calendar, content).'
                : 'Read all data and send guest messages. Cannot manage listings (no pricing, calendar, or content writes).'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-white/45">Redirect URL</label>
            <input
              type="url"
              className="input font-mono text-xs"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yourapp.com/airbnb/return"
            />
            <p className="text-xs muted">
              Where Repull will send the user after they grant consent. Defaults to this demo&apos;s{' '}
              <span className="kbd">/airbnb-redirect</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={createSession}
              disabled={flow.phase === 'creating' || !ready || !redirectUrl.trim()}
            >
              {flow.phase === 'creating' ? 'Minting…' : 'Create connect session'}
            </button>
            {flow.phase === 'connected' || flow.status?.connected ? (
              <button type="button" className="btn" onClick={disconnect}>
                Disconnect Airbnb
              </button>
            ) : null}
          </div>

          {flow.phase === 'error' && flow.error ? (
            <div
              className="rounded-md text-xs p-3 font-mono"
              style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
            >
              {flow.error}
            </div>
          ) : null}

          {/* Polling card */}
          <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-white/45">Connect status</div>
              <span
                className="text-xs uppercase tracking-wide"
                style={{
                  color: flow.status?.connected ? '#3ecf8e' : flow.phase === 'awaiting' ? '#f5a524' : '#888',
                }}
              >
                {flow.status?.connected ? 'connected' : flow.phase === 'awaiting' ? 'awaiting consent' : 'idle'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <Field label="provider" value={flow.status?.provider ?? 'airbnb'} />
              <Field label="connected" value={flow.status?.connected ? 'true' : 'false'} />
              <Field label="airbnb_user_id" value={flow.status?.externalAccountId ?? '—'} />
              <Field label="session" value={session?.sessionId ?? '—'} />
            </div>
            {session?.oauthUrl ? (
              <a
                href={session.oauthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full mt-2"
              >
                Continue at connect.repull.dev →
              </a>
            ) : null}
          </div>
        </div>

        {/* RIGHT — code panel */}
        <div className="bg-[#080808] p-5">
          <CodePanel
            title="SDK call"
            endpoint="POST /v1/connect/airbnb"
            snippets={snippets}
          />
          <p className="text-xs muted mt-3 leading-relaxed">
            Returns <code className="kbd">{'{ oauthUrl, sessionId, provider, expiresAt }'}</code>. Send the
            user to <code className="kbd">oauthUrl</code> — they&apos;ll land on{' '}
            <code className="kbd">connect.repull.dev</code>, grant consent on Airbnb, then bounce back to your
            redirect.
          </p>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 truncate">
      <span className="text-white/35 uppercase tracking-wider text-[10px]">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
