import { describe, expect, it } from 'vitest';
import { Repull, RepullAuthError } from '../src/index.js';

interface Captured {
  method: string;
  url: URL;
  body: unknown;
}

function client(responseBody: unknown = {}, status = 200) {
  const calls: Captured[] = [];
  const repull = new Repull({
    apiKey: 'sk_test_x',
    maxRetries: 0,
    fetch: async (input, init) => {
      calls.push({
        method: String(init?.method),
        url: new URL(String(input)),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(JSON.stringify(responseBody), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  return { repull, calls };
}

describe('connect.airbnb.create', () => {
  it('omits accessType when the caller does not pass one, so the host keeps the tier choice', async () => {
    const { repull, calls } = client({ url: 'https://connect.repull.dev/x' });
    await repull.connect.airbnb.create({ redirectUrl: 'https://app.example.com/done' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url.pathname).toBe('/v1/connect/airbnb');
    expect(calls[0].body).toEqual({ redirectUrl: 'https://app.example.com/done' });
    expect(calls[0].body).not.toHaveProperty('accessType');
  });

  it('sends accessType when the caller chooses one', async () => {
    const { repull, calls } = client({});
    await repull.connect.airbnb.create({ redirectUrl: 'https://a.test/', accessType: 'messaging' });
    expect(calls[0].body).toEqual({ redirectUrl: 'https://a.test/', accessType: 'messaging' });
  });
});

describe('disconnect', () => {
  const response = {
    disconnected: true,
    provider: 'airbnb',
    accountId: '143778955',
    listingsDeactivated: ['4118'],
  };

  it('passes accountId as a query param and returns the typed response', async () => {
    const { repull, calls } = client(response);
    const res = await repull.connect.airbnb.disconnect({ accountId: '143778955' });
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url.pathname).toBe('/v1/connect/airbnb');
    expect(calls[0].url.searchParams.get('accountId')).toBe('143778955');
    expect(res.listingsDeactivated).toEqual(['4118']);
  });

  it('sends no query string when accountId is omitted', async () => {
    const { repull, calls } = client(response);
    await repull.connect.booking.disconnect();
    expect(calls[0].url.pathname).toBe('/v1/connect/booking');
    expect(calls[0].url.search).toBe('');
  });

  it('generic connect.disconnect(provider, { accountId }) works too', async () => {
    const { repull, calls } = client(response);
    await repull.connect.disconnect('booking', { accountId: 12345 });
    expect(calls[0].url.pathname).toBe('/v1/connect/booking');
    expect(calls[0].url.searchParams.get('accountId')).toBe('12345');
  });
});

describe('listings.setStatus', () => {
  it('POSTs string ids to /v1/listings/status', async () => {
    const { repull, calls } = client({ active: false, updated: ['4118'], unchanged: ['4119'] });
    const res = await repull.listings.setStatus({ listingIds: [4118, '4119'], active: false });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url.pathname).toBe('/v1/listings/status');
    expect(calls[0].body).toEqual({ listingIds: ['4118', '4119'], active: false });
    expect(res.updated).toEqual(['4118']);
    expect(res.unchanged).toEqual(['4119']);
  });
});

describe('list status filters', () => {
  it('listings.list forwards status=all', async () => {
    const { repull, calls } = client({ data: [], pagination: { nextCursor: null, hasMore: false } });
    await repull.listings.list({ status: 'all' });
    expect(calls[0].url.searchParams.get('status')).toBe('all');
  });

  it('properties.list forwards status=inactive', async () => {
    const { repull, calls } = client({ data: [], pagination: { nextCursor: null, hasMore: false } });
    await repull.properties.list({ status: 'inactive' });
    expect(calls[0].url.searchParams.get('status')).toBe('inactive');
  });
});

describe('listing_inactive errors', () => {
  it('surfaces code and listingIds on the thrown error', async () => {
    const { repull } = client(
      {
        error: {
          code: 'listing_inactive',
          message: 'Listing 4118 is inactive',
          listing_ids: ['4118'],
        },
      },
      403,
    );
    const err = await repull.listings.get('4118').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RepullAuthError);
    expect((err as RepullAuthError).code).toBe('listing_inactive');
    expect((err as RepullAuthError).listingIds).toEqual(['4118']);
  });
});
