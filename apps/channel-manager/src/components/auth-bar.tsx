'use client';

import { useState } from 'react';
import { useRepull } from '@/lib/repull-provider';

function shortKey(k: string) {
  return k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k;
}

export function AuthBar() {
  const { apiKey, setApiKey } = useRepull();
  const [draft, setDraft] = useState('');

  return (
    <div className="card p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="flex items-center gap-2 sm:min-w-[180px]">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: apiKey ? '#3ecf8e' : '#777' }}
        />
        <span className="text-xs muted font-mono">
          {apiKey ? shortKey(apiKey) : 'no key'}
        </span>
      </div>
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        className="input font-mono text-xs flex-1"
        placeholder="paste your Repull API key (sk_...)"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary"
        disabled={!draft.trim()}
        onClick={() => {
          setApiKey(draft.trim());
          setDraft('');
        }}
      >
        Save key
      </button>
      {apiKey ? (
        <button type="button" className="btn" onClick={() => setApiKey(null)}>
          Clear
        </button>
      ) : null}
    </div>
  );
}
