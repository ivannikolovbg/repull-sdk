'use client';

import { Repull } from '@repull/sdk';

/**
 * Browser-safe Repull client.
 *
 *   - All requests hit `/api/repull-proxy/*` on this Next deployment.
 *   - The proxy reads the user's API key from the `x-repull-key` header and
 *     forwards a real Authorization header server-side. The key never lands
 *     in a Vercel build artifact or a browser request to api.repull.dev.
 *   - The SDK is constructed with a custom `fetch` so we can stamp the
 *     `x-repull-key` header on every call.
 */

const SANDBOX_SENTINEL = '__sandbox__';

export type ClientKey = string | null;

export function getStoredKey(): ClientKey {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('repull:apiKey');
  } catch {
    return null;
  }
}

export function setStoredKey(key: ClientKey): void {
  if (typeof window === 'undefined') return;
  try {
    if (key) window.localStorage.setItem('repull:apiKey', key);
    else window.localStorage.removeItem('repull:apiKey');
  } catch {
    /* no-op */
  }
}

export function makeClient(opts: { useSandbox?: boolean; apiKey?: ClientKey } = {}): Repull {
  const headerValue = opts.useSandbox ? SANDBOX_SENTINEL : opts.apiKey ?? '';

  return new Repull({
    baseUrl: '/api/repull-proxy',
    fetch: (url, init = {}) => {
      const headers = new Headers(init.headers);
      // The proxy converts this header into the upstream Authorization.
      if (headerValue) headers.set('x-repull-key', headerValue);
      return globalThis.fetch(url, { ...init, headers });
    },
  });
}
