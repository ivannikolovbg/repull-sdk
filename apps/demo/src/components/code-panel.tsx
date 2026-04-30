'use client';

import { useState } from 'react';

export interface CodeSnippet {
  label: string;
  language: 'ts' | 'js' | 'curl';
  code: string;
}

export function CodePanel({
  title,
  snippets,
  endpoint,
}: {
  title?: string;
  snippets: CodeSnippet[];
  endpoint?: string;
}) {
  const [active, setActive] = useState(0);
  const snippet = snippets[active] ?? snippets[0];

  return (
    <div className="code-frame">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          {title ? <span className="text-xs uppercase tracking-wide text-white/45 truncate">{title}</span> : null}
          {endpoint ? <span className="text-xs font-mono text-white/35 truncate">{endpoint}</span> : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {snippets.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActive(i)}
              className="tab-button"
              data-active={i === active}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <pre>{snippet?.code ?? ''}</pre>
    </div>
  );
}
