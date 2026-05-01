'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * opens connect.repull.dev in a popup window (Plaid pattern), and listens
 * for the `repull:connect:completed` postMessage event so we can refresh
 * the "Your connections" list inline.
 *
 * Why a popup window, not an iframe: every OAuth provider (Airbnb,
 * BookingSync, Hospitable's hosted page) sets `X-Frame-Options: sameorigin`
 * or `Content-Security-Policy: frame-ancestors`, which kills any iframe-
 * based flow at the consent step. A popup window can navigate top-level to
 * the OAuth provider AND postMessage back to the opener via window.opener.
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
  const popupRef = useRef<Window | null>(null);
  const popupWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Default redirect to this demo page so the user sees a clean roundtrip.
  useEffect(() => {
    if (!redirectUrl && typeof window !== 'undefined') {
      setRedirectUrl(`${window.location.origin}/`);
    }
  }, [redirectUrl]);

  const cleanupWatcher = useCallback(() => {
    if (popupWatchRef.current) {
      clearInterval(popupWatchRef.current);
      popupWatchRef.current = null;
    }
  }, []);

  // Listen for the picker's postMessage so we can refresh + close the popup.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== CONNECT_HOST) return;
      const data = ev.data as { type?: string; provider?: string; error?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'repull:connect:completed') {
        setFlow((prev) => ({
          ...prev,
          phase: 'connected',
          completedProvider: data.provider ?? prev.completedProvider,
        }));
        onConnected?.();
        cleanupWatcher();
        try {
          popupRef.current?.close();
        } catch {
          /* cross-origin close may throw on some browsers — popup self-closes anyway */
        }
      } else if (data.type === 'repull:connect:error' || data.type === 'repull:connect:close') {
        setFlow((prev) => ({
          ...prev,
          phase: data.type === 'repull:connect:error' ? 'error' : 'idle',
          error: data.error,
        }));
        cleanupWatcher();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onConnected, cleanupWatcher]);

  // Detect the user closing the popup manually so we don't get stuck on
  // "awaiting selection" forever.
  useEffect(() => () => cleanupWatcher(), [cleanupWatcher]);

  const ready = Boolean(auth.apiKey || auth.useSandbox);

  async function startPicker() {
    if (!ready) {
      setFlow({ phase: 'error', error: 'Add a Repull API key (or click "Use sandbox") above first.' });
      return;
    }
    // Open the popup synchronously inside the click handler so popup blockers
    // recognize this as user-initiated. We swap its location once the session
    // mints — opening with the URL straight away would block on the slow
    // network roundtrip.
    const features = popupFeatures();
    const popup = window.open('about:blank', 'repull-connect', features);
    if (!popup) {
      setFlow({
        phase: 'error',
        error: 'Popup blocked. Allow popups for this site, then try again.',
      });
      return;
    }
    popupRef.current = popup;
    setFlow({ phase: 'creating' });
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    try {
      const session = await client.connect.createSession({
        redirectUrl: redirectUrl.trim(),
      });
      setFlow({ phase: 'open', session });
      try {
        popup.location.href = session.url;
        popup.focus();
      } catch {
        // Cross-origin location set is allowed during initial about:blank phase,
        // but if the browser is paranoid, fall back to a full reload via name.
        window.open(session.url, 'repull-connect', features);
      }

      // Watch for the user manually closing the popup so we don't sit on
      // "awaiting selection" indefinitely. Stops once we get a completed
      // postMessage (cleanupWatcher) or the popup is gone.
      popupWatchRef.current = setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          cleanupWatcher();
          setFlow((prev) => (prev.phase === 'open' ? { ...prev, phase: 'idle' } : prev));
        }
      }, 750);
    } catch (err) {
      try {
        popup.close();
      } catch {
        /* noop */
      }
      setFlow({ phase: 'error', error: (err as Error).message ?? 'Unknown error' });
    }
  }

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

// Open the picker in a popup window — OAuth providers (Airbnb, BookingSync,
// etc) set X-Frame-Options: sameorigin so iframes won't work for OAuth.
const popup = window.open(
  session.url,
  'repull-connect',
  'width=480,height=720,popup=yes',
);

window.addEventListener('message', (ev) => {
  if (ev.origin !== 'https://connect.repull.dev') return;
  if (ev.data?.type === 'repull:connect:completed') {
    // Refresh your "Your connections" list here.
  }
});
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
    </section>
  );
}

function popupFeatures(): string {
  // Center the popup over the current viewport so it's obvious it came from
  // this page (and so it lines up with the launching button instead of
  // appearing on a different monitor).
  const w = 480;
  const h = 720;
  if (typeof window === 'undefined') return `width=${w},height=${h},popup=yes`;
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop = window.screenTop ?? window.screenY ?? 0;
  const ww = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const wh = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = Math.max(0, dualLeft + (ww - w) / 2);
  const top = Math.max(0, dualTop + (wh - h) / 2);
  return `width=${w},height=${h},left=${left},top=${top},popup=yes,noopener=no,noreferrer=no,scrollbars=yes`;
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
