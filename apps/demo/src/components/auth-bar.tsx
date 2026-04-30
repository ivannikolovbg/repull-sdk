'use client';

import { useEffect, useState } from 'react';
import { getStoredKey, setStoredKey } from '@/lib/repull-client';
import { shortKey } from '@/lib/format';

export interface AuthState {
  apiKey: string | null;
  useSandbox: boolean;
}

export function AuthBar({
  state,
  onChange,
}: {
  state: AuthState;
  onChange: (next: AuthState) => void;
}) {
  const [draft, setDraft] = useState('');
  const [sandboxAvailable, setSandboxAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/sandbox/status')
      .then((r) => r.json())
      .then((j) => setSandboxAvailable(Boolean(j?.available)))
      .catch(() => setSandboxAvailable(false));
  }, []);

  useEffect(() => {
    const stored = getStoredKey();
    if (stored && !state.apiKey && !state.useSandbox) {
      onChange({ apiKey: stored, useSandbox: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyKey() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setStoredKey(trimmed);
    onChange({ apiKey: trimmed, useSandbox: false });
    setDraft('');
  }

  function clearKey() {
    setStoredKey(null);
    onChange({ apiKey: null, useSandbox: false });
  }

  function useSandbox() {
    onChange({ apiKey: null, useSandbox: true });
  }

  const status = state.useSandbox
    ? { label: 'Sandbox', detail: 'Vanio-controlled demo key', tone: 'sandbox' as const }
    : state.apiKey
      ? { label: 'Connected', detail: shortKey(state.apiKey), tone: 'live' as const }
      : { label: 'No key', detail: 'Paste your Repull API key', tone: 'idle' as const };

  return (
    <div className="card px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <div className="flex items-center gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background:
              status.tone === 'live' ? '#3ecf8e' : status.tone === 'sandbox' ? '#f5a524' : '#666',
            boxShadow:
              status.tone === 'idle' ? 'none' : `0 0 12px ${status.tone === 'live' ? '#3ecf8e' : '#f5a524'}`,
          }}
        />
        <div className="leading-tight">
          <div className="text-sm font-medium">{status.label}</div>
          <div className="text-xs text-white/45 font-mono">{status.detail}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-2">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="input font-mono text-xs"
          placeholder="paste your Repull API key (sk_...)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyKey();
          }}
        />
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={applyKey} disabled={!draft.trim()}>
            Use this key
          </button>
          {sandboxAvailable ? (
            <button type="button" className="btn" onClick={useSandbox}>
              Use sandbox
            </button>
          ) : null}
          {state.apiKey ? (
            <button type="button" className="btn" onClick={clearKey}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
