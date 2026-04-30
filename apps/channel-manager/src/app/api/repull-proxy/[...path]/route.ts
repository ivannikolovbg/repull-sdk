import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM = process.env.REPULL_API_BASE_URL ?? 'https://api.repull.dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstreamPath = '/' + (path ?? []).join('/');
  const url = `${UPSTREAM}${upstreamPath}${req.nextUrl.search}`;

  const supplied = req.headers.get('x-repull-key') ?? '';
  if (!supplied) {
    return NextResponse.json(
      { error: { code: 'missing_api_key', message: 'No API key supplied. Save one in the auth bar.' } },
      { status: 401 },
    );
  }

  const headers = new Headers();
  headers.set('authorization', `Bearer ${supplied}`);
  headers.set('accept', 'application/json');
  if (req.headers.get('content-type')) headers.set('content-type', req.headers.get('content-type')!);
  headers.set('user-agent', '@repull/channel-manager-proxy/0.1');

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text();
    if (body) init.body = body;
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url, init);
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'upstream_fetch_failed', message: (err as Error).message } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const ct = upstreamRes.headers.get('content-type');
  if (ct) responseHeaders.set('content-type', ct);

  const text = await upstreamRes.text();
  return new NextResponse(text, { status: upstreamRes.status, headers: responseHeaders });
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE, handle as PUT };
