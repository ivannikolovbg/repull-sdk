import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy that forwards any /api/repull-proxy/* request to
 * https://api.repull.dev/* (or REPULL_API_BASE_URL).
 *
 * Auth model:
 *   - Client puts the Repull API key in `localStorage` and forwards it via
 *     the `x-repull-key` header on every request.
 *   - When the special header value `__sandbox__` is sent, this route uses
 *     the server-side `REPULL_SANDBOX_API_KEY` instead. That env never
 *     reaches the browser bundle.
 *   - If neither header nor sandbox key is set, the request is rejected.
 *
 * Per-IP rate limiting is stubbed for v1 (no Redis dependency in demo);
 * extend before any high-traffic deployment.
 */

const UPSTREAM = process.env.REPULL_API_BASE_URL ?? 'https://api.repull.dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public upstream endpoints that don't require an API key. These are safe to
 * proxy unauthenticated because they expose no customer data — health is a
 * heartbeat, providers is a static catalog of supported channels.
 *
 * Pinning a small allowlist (instead of "anything starting with /v1/connect")
 * keeps the surface tight: future authenticated endpoints under the same
 * prefix don't accidentally become public.
 */
function isPublicUpstreamPath(upstreamPath: string): boolean {
  if (upstreamPath === '/v1/health') return true;
  if (upstreamPath === '/v1/connect/providers') return true;
  return false;
}

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstreamPath = '/' + (path ?? []).join('/');
  const search = req.nextUrl.search;
  const url = `${UPSTREAM}${upstreamPath}${search}`;

  const supplied = req.headers.get('x-repull-key') ?? '';
  const isPublic = isPublicUpstreamPath(upstreamPath);
  let bearer: string | undefined;
  if (supplied === '__sandbox__') {
    bearer = process.env.REPULL_SANDBOX_API_KEY;
    if (!bearer && !isPublic) {
      return NextResponse.json(
        {
          error: {
            code: 'sandbox_unavailable',
            message:
              'No sandbox API key is configured on this demo deployment. Paste your own Repull API key (sk_…) instead.',
          },
        },
        { status: 503 },
      );
    }
  } else if (supplied) {
    bearer = supplied;
  }

  if (!bearer && !isPublic) {
    return NextResponse.json(
      {
        error: {
          code: 'missing_api_key',
          message:
            'No Repull API key supplied. Add a key via the bar at the top of the demo, or click "Use sandbox" if available.',
        },
      },
      { status: 401 },
    );
  }

  const headers = new Headers();
  if (bearer) headers.set('authorization', `Bearer ${bearer}`);
  headers.set('accept', 'application/json');
  if (req.headers.get('content-type')) {
    headers.set('content-type', req.headers.get('content-type')!);
  }
  headers.set('user-agent', '@repull/demo-proxy/0.1');

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text();
    if (body) init.body = body;
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url, init);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: 'upstream_fetch_failed',
          message: (err as Error).message ?? 'Failed to reach api.repull.dev',
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const ct = upstreamRes.headers.get('content-type');
  if (ct) responseHeaders.set('content-type', ct);
  const requestId = upstreamRes.headers.get('x-request-id');
  if (requestId) responseHeaders.set('x-request-id', requestId);
  // Don't leak the rest of upstream headers (could contain internal info).

  const text = await upstreamRes.text();
  return new NextResponse(text, { status: upstreamRes.status, headers: responseHeaders });
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE, handle as PUT };
