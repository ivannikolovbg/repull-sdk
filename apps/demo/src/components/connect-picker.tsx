'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import { CodePanel, type CodeSnippet } from './code-panel';
import type { AuthState } from './auth-bar';
import type { ConnectPickerSession } from '@repull/sdk';

type Phase = 'idle' | 'creating' | 'open' | 'connected' | 'error';

interface FlowState {
  phase: Phase;
  session?: ConnectPickerSession;
  error?: string;
  /** Provider id reported by the picker postMessage handshake. */
  completedProvider?: string;
}

const CONNECT_HOST = 'https://connect.repull.dev';

/**
 * Primary CTA for the demo. Mints a multi-channel Connect picker session,
 * opens connect.repull.dev in an iframe modal, and listens for the
 * `repull:connect:completed` postMessage event so we can refresh the
 * "Your connections" list inline.
 */
export function ConnectPicker({
  auth,
  onConnected,
}: {
  auth: AuthState;
  onConnected?: () => void;
}) {
  const [redirectUrl, setRedirectUrl] = useState('');
  const [flow, setFlow] = useState<FlowState>({ phase: 'idle' });
  const [showInline, setShowInline] = useState(true); // open in iframe modal vs new tab
  const closeRef = useRef<() => void>(() => {});

  // Default redirect to this demo page so the user sees a clean roundtrip.
  useEffect(() => {
    if (!redirectUrl && typeof window !== 'undefined') {
      setRedirectUrl(`${window.location.origin}/`);
    }
  }, [redirectUrl]);

  // Listen for the picker's postMessage so we can close the modal + refresh.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== CONNECT_HOST) return;
      const data = ev.data as { type?: string; provider?: string } | null;
      if (!data || typeof data !== 'object') return;
      // Tolerant of either event name — the hosted picker can emit either.
      if (data.type === 'repull:connect:completed' || data.type === 'repull:connect:close') {
        setFlow((prev) => ({
          ...prev,
          phase: data.type === 'repull:connect:completed' ? 'connected' : prev.phase,
          completedProvider: data.provider ?? prev.completedProvider,
        }));
        if (data.type === 'repull:connect:completed') {
          onConnected?.();
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onConnected]);

  const ready = Boolean(auth.apiKey || auth.useSandbox);

  async function startPicker() {
    if (!ready) {
      setFlow({ phase: 'error', error: 'Add a Repull API key (or click "Use sandbox") above first.' });
      return;
    }
    setFlow({ phase: 'creating' });
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    try {
      const session = await client.connect.createSession({
        redirectUrl: redirectUrl.trim(),
      });
      setFlow({ phase: 'open', session });
      if (!showInline) {
        window.open(session.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setFlow({ phase: 'error', error: (err as Error).message ?? 'Unknown error' });
    }
  }

  function closeModal() {
    setFlow((prev) => (prev.phase === 'open' ? { ...prev, phase: 'idle' } : prev));
  }
  closeRef.current = closeModal;

  // ESC to dismiss the iframe modal.
  useEffect(() => {
    if (flow.phase !== 'open' || !showInline) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flow.phase, showInline]);

  const snippets = useMemo<CodeSnippet[]>(() => {
    const ts = `import { Repull } from '@repull/sdk';

const repull = new Repull({ apiKey: process.env.REPULL_API_KEY });

const session = await repull.connect.createSession({
  redirectUrl: ${JSON.stringify(redirectUrl || 'https://yourapp.com/connected')},
  // Optional — scope the picker to a subset of channels.
  // allowedProviders: ['airbnb', 'booking', 'hostaway'],
});

// session.url        -> hosted picker on connect.repull.dev/{sessionId}
// session.sessionId  -> stable handle for follow-ups
// session.expiresAt  -> ISO timestamp
window.location.href = session.url;
`;
    const curl = `curl -X POST https://api.repull.dev/v1/connect \\
  -H 'Authorization: Bearer $REPULL_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({
    redirectUrl: redirectUrl || 'https://yourapp.com/connected',
  })}'`;
    return [
      { label: 'TS', language: 'ts', code: ts },
      { label: 'curl', language: 'curl', code: curl },
    ];
  }, [redirectUrl]);

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
        <span className="inline-block w-1.5 h-5 rounded-full bg-gradient-to-b from-[#ff5757] to-[#ff7a2b]" />
        <div className="flex-1">
          <h2 className="section-h2">Multi-channel Connect picker</h2>
          <p className="text-xs muted mt-0.5">
            One session, 13 channels. Hosted at <span className="kbd">connect.repull.dev</span>.
          </p>
        </div>
        <span
          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
          style={{ background: 'rgba(255,122,43,0.12)', color: '#ff7a2b', border: '1px solid rgba(255,122,43,0.35)' }}
        >
          New
        </span>
      </header>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-px bg-white/[0.04]">
        {/* LEFT — controls + status */}
        <div className="bg-[#0b0b0b] p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-white/45">Redirect URL</label>
            <input
              type="url"
              className="input font-mono text-xs"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yourapp.com/connected"
            />
            <p className="text-xs muted">
              Where the user lands after they finish a connection in the picker.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs muted">
            <input
              id="inline-modal"
              type="checkbox"
              checked={showInline}
              onChange={(e) => setShowInline(e.target.checked)}
              className="accent-[#ff7a2b]"
            />
            <label htmlFor="inline-modal" className="cursor-pointer">
              Open in inline modal (uncheck to open in a new tab)
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={startPicker}
              disabled={flow.phase === 'creating' || !ready || !redirectUrl.trim()}
            >
              {flow.phase === 'creating' ? (
                <>
                  <Spinner /> Minting session…
                </>
              ) : (
                <>Try the multi-channel Connect picker</>
              )}
            </button>
            {flow.session ? (
              <a
                href={flow.session.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                Open in new tab
              </a>
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

          <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-white/45">Picker session</div>
              <span
                className="text-xs uppercase tracking-wide"
                style={{
                  color:
                    flow.phase === 'connected'
                      ? '#3ecf8e'
                      : flow.phase === 'open'
                        ? '#f5a524'
                        : '#888',
                }}
              >
                {flow.phase === 'connected'
                  ? `connected${flow.completedProvider ? ` · ${flow.completedProvider}` : ''}`
                  : flow.phase === 'open'
                    ? 'awaiting selection'
                    : flow.phase === 'creating'
                      ? 'minting'
                      : 'idle'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <Field label="session" value={flow.session?.sessionId ?? '—'} />
              <Field label="expires" value={flow.session?.expiresAt ?? '—'} />
            </div>
            {flow.session?.url ? (
              <div className="text-[11px] font-mono text-white/40 truncate" title={flow.session.url}>
                {flow.session.url}
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT — code preview */}
        <div className="bg-[#080808] p-5 space-y-3">
          <CodePanel
            title="What just happened"
            endpoint="POST /v1/connect"
            snippets={snippets}
          />
          <p className="text-xs muted leading-relaxed">
            Returns <code className="kbd">{'{ sessionId, url, expiresAt, state }'}</code>. The hosted page
            renders the channel chooser, runs each provider&apos;s pattern (OAuth / credentials / claim /
            activation), then sends the user to your <code className="kbd">redirectUrl</code>.
          </p>
        </div>
      </div>

      {/* Iframe modal */}
      {flow.phase === 'open' && showInline && flow.session ? (
        <PickerModal url={flow.session.url} onClose={closeModal} />
      ) : null}
    </section>
  );
}

function PickerModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Repull Connect picker"
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0a0a0a] shadow-2xl"
        style={{ width: 'min(480px, 92vw)', height: 'min(720px, 88vh)' }}
      >
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 z-10 bg-gradient-to-b from-black/90 to-transparent">
          <div className="text-[11px] uppercase tracking-wider text-white/55">connect.repull.dev</div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/65 hover:text-white text-xs px-2 py-1 rounded-md border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
            aria-label="Close picker"
          >
            Close
          </button>
        </div>
        <iframe
          src={url}
          title="Repull Connect picker"
          className="w-full h-full block"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"
    />
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
