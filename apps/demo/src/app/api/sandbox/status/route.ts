import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lets the client know whether a sandbox key is wired on this deployment. */
export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.REPULL_SANDBOX_API_KEY),
  });
}
