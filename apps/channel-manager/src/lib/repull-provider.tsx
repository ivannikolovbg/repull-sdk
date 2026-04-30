'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Repull } from '@repull/sdk';

const STORAGE_KEY = 'repull-cm:apiKey';

interface RepullContextValue {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  client: Repull;
}

const RepullContext = createContext<RepullContextValue | null>(null);

export function RepullProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  useEffect(() => {
    try {
      setApiKeyState(window.localStorage.getItem(STORAGE_KEY));
    } catch { /* no-op */ }
  }, []);

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    try {
      if (key) window.localStorage.setItem(STORAGE_KEY, key);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* no-op */ }
  };

  const client = useMemo(() => {
    return new Repull({
      baseUrl: '/api/repull-proxy',
      fetch: (url, init = {}) => {
        const headers = new Headers(init.headers);
        if (apiKey) headers.set('x-repull-key', apiKey);
        return globalThis.fetch(url, { ...init, headers });
      },
    });
  }, [apiKey]);

  return <RepullContext.Provider value={{ apiKey, setApiKey, client }}>{children}</RepullContext.Provider>;
}

export function useRepull(): RepullContextValue {
  const ctx = useContext(RepullContext);
  if (!ctx) throw new Error('useRepull must be inside <RepullProvider>');
  return ctx;
}
