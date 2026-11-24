import { describe, expect, it } from 'vitest';
import { Repull } from '../src/index.js';

interface Captured {
  method: string;
  url: URL;
  body: unknown;
}

function client(responseBody: unknown = {}) {
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
      return new Response(JSON.stringify(responseBody), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  return { repull, calls };
}

describe('channels.tiket', () => {
  it('lists properties and reads one by Hotel ID', async () => {
    const { repull, calls } = client({ properties: [{ propertyId: '123', mappingStatus: 'mapped', rooms: [], listings: [] }] });
    const res = await repull.channels.tiket.properties.list({ status: 'all' });
    expect(res.properties[0].propertyId).toBe('123');
    await repull.channels.tiket.properties.get(123);
    await repull.channels.tiket.properties.rooms('123');
    expect(calls.map((c) => `${c.method} ${c.url.pathname}${c.url.search}`)).toEqual([
      'GET /v1/channels/tiket/properties?status=all',
      'GET /v1/channels/tiket/properties/123',
      'GET /v1/channels/tiket/properties/123/rooms',
    ]);
  });

  it('writes rates by property and returns the read-back result', async () => {
    const { repull, calls } = client({ propertyId: '123', type: 'rates', updates: 1, requests: 1, applied: 'verified' });
    const res = await repull.channels.tiket.availability.update({
      property_id: '123',
      type: 'rates',
      updates: [{ roomTypeCode: 'R1', ratePlanCode: 'P1', start: '2026-12-01', end: '2026-12-02', price: 25000000 }],
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/tiket/availability');
    expect(calls[0].body).toEqual({
      property_id: '123',
      type: 'rates',
      updates: [{ roomTypeCode: 'R1', ratePlanCode: 'P1', start: '2026-12-01', end: '2026-12-02', price: 25000000 }],
    });
    expect(res.applied).toBe('verified');
  });

  it('reads and writes pricing by listing, maps rooms, lists reservations, syncs and runs setup', async () => {
    const { repull, calls } = client({});
    await repull.channels.tiket.listings.getPricing(4118, { number_of_days: 7 });
    await repull.channels.tiket.listings.updatePricing(4118, { updates: [{ start: '2026-12-01', end: '2026-12-01', price: 1 }] });
    await repull.channels.tiket.listings.map({ property_id: '123', mappings: [{ roomTypeCode: 'R1', listingId: 4118 }] });
    await repull.channels.tiket.reservations.list({ property_id: '123', status: 'cancelled' });
    await repull.channels.tiket.content({ property_id: '123' });
    await repull.channels.tiket.sync({ property_id: '123' });
    await repull.channels.tiket.setup({ action: 'check-activation', hotel_id: '123' });
    expect(calls.map((c) => `${c.method} ${c.url.pathname}${c.url.search}`)).toEqual([
      'GET /v1/channels/tiket/listings/4118/pricing?number_of_days=7',
      'PUT /v1/channels/tiket/listings/4118/pricing',
      'POST /v1/channels/tiket/listings/map',
      'GET /v1/channels/tiket/reservations?property_id=123&status=cancelled',
      'GET /v1/channels/tiket/content?property_id=123',
      'POST /v1/channels/tiket/sync',
      'POST /v1/channels/tiket/setup',
    ]);
    expect(calls[6].body).toEqual({ action: 'check-activation', hotel_id: '123' });
  });
});

describe('listings.publishToTiket and connect.tiket', () => {
  it('publishes content to tiket.com', async () => {
    const { repull, calls } = client({ listingId: '4118', channel: 'tiket', result: { pushed: true, sections: ['room'] } });
    const res = await repull.listings.publishToTiket(4118, { hotelId: '123' });
    expect(`${calls[0].method} ${calls[0].url.pathname}`).toBe('POST /v1/listings/4118/publish/tiket');
    expect(calls[0].body).toEqual({ hotelId: '123' });
    expect(res.result?.pushed).toBe(true);
  });

  it('opens a hosted Connect session scoped to tiket.com', async () => {
    const { repull, calls } = client({ url: 'https://connect.repull.dev/s' });
    await repull.connect.tiket.create({ redirectUrl: 'https://app.example.com/done' });
    await repull.connect.tiket.status();
    expect(`${calls[0].method} ${calls[0].url.pathname}`).toBe('POST /v1/connect');
    expect(calls[0].body).toEqual({ redirectUrl: 'https://app.example.com/done', allowedProviders: ['tiket'] });
    expect(`${calls[1].method} ${calls[1].url.pathname}`).toBe('GET /v1/connect/tiket');
  });
});
