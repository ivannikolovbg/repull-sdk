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

describe('listings.pullFromAirbnb', () => {
  it('POSTs an empty body to /v1/listings/{id}/pull/airbnb', async () => {
    const { repull, calls } = client({
      listingId: '4118',
      channel: 'airbnb',
      refreshedFromChannel: true,
      sections: ['details', 'photos'],
    });
    const res = await repull.listings.pullFromAirbnb(4118);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url.pathname).toBe('/v1/listings/4118/pull/airbnb');
    expect(calls[0].body).toEqual({});
    expect(res.sections).toEqual(['details', 'photos']);
  });

  it('forwards airbnbConnectionId when the listing has several connections', async () => {
    const { repull, calls } = client({ listingId: '4118', channel: 'airbnb' });
    await repull.listings.pullFromAirbnb('4118', { airbnbConnectionId: 'c-99' });
    expect(calls[0].body).toEqual({ airbnbConnectionId: 'c-99' });
  });
});

describe('listing list expansions', () => {
  it('listings.list forwards include=thumbnail', async () => {
    const { repull, calls } = client({ data: [], pagination: { nextCursor: null, hasMore: false } });
    await repull.listings.list({ include: 'thumbnail' });
    expect(calls[0].url.searchParams.get('include')).toBe('thumbnail');
  });

  it('channels.airbnb.listings.list forwards include and account_id', async () => {
    const { repull, calls } = client({
      data: [],
      pagination: { nextCursor: null, hasMore: false },
      dataFreshness: { lastSyncedAt: null, stale: false },
    });
    await repull.channels.airbnb.listings.list({
      include: 'amenities,thumbnail',
      account_id: '1772489413932732258',
    });
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings');
    expect(calls[0].url.searchParams.get('include')).toBe('amenities,thumbnail');
    expect(calls[0].url.searchParams.get('account_id')).toBe('1772489413932732258');
  });
});

describe('airbnb booking settings', () => {
  it('GETs the settings for a listing', async () => {
    const { repull, calls } = client({
      data: { bookingMode: 'instant_book' },
      dataFreshness: { lastSyncedAt: null, stale: false },
    });
    const res = await repull.channels.airbnb.listings.bookingSettings.get('4118');
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/booking-settings');
    expect(res.data.bookingMode).toBe('instant_book');
  });

  it('PUTs a partial update and returns which groups were applied', async () => {
    const { repull, calls } = client({ data: { applied: ['bookingSettings'], settings: {} } });
    const res = await repull.channels.airbnb.listings.bookingSettings.update(4118, {
      instantBook: { enabled: true },
      cancellation: { nonRefundable: { enabled: true, discountPercent: 10 } },
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/booking-settings');
    expect(calls[0].body).toEqual({
      instantBook: { enabled: true },
      cancellation: { nonRefundable: { enabled: true, discountPercent: 10 } },
    });
    expect(res.data.applied).toEqual(['bookingSettings']);
  });
});

describe('airbnb content writes', () => {
  it('details.update PUTs to /details and surfaces blockedFields', async () => {
    const { repull, calls } = client({
      listingId: '4118',
      written: ['quiet_hours'],
      blockedFields: ['room_type_category'],
    });
    const res = await repull.channels.airbnb.listings.details.update('4118', {
      quiet_hours: [{ start_time: '22', end_time: '7' }],
      room_type_category: 'entire_home',
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/details');
    expect(res.blockedFields).toEqual(['room_type_category']);
  });

  it('descriptions.update writes one locale', async () => {
    const { repull, calls } = client({ listingId: '4118', written: ['summary'], blockedFields: [] });
    await repull.channels.airbnb.listings.descriptions.update('4118', {
      locale: 'it',
      description: { summary: 'Un appartamento luminoso.' },
    });
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/descriptions');
    expect(calls[0].body).toEqual({
      locale: 'it',
      description: { summary: 'Un appartamento luminoso.' },
    });
  });

  it('descriptions.list forwards locale + country', async () => {
    const { repull, calls } = client({ data: [] });
    await repull.channels.airbnb.listings.descriptions.list('4118', { locale: 'it', country: 'IT' });
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url.searchParams.get('locale')).toBe('it');
    expect(calls[0].url.searchParams.get('country')).toBe('IT');
  });

  it('permits.list forwards ?source=live', async () => {
    const { repull, calls } = client({ data: [] });
    await repull.channels.airbnb.listings.permits.list('4118', { source: 'live' });
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/permits');
    expect(calls[0].url.searchParams.get('source')).toBe('live');
  });

  it('permits.update PUTs the answers', async () => {
    const { repull, calls } = client({ data: {} });
    await repull.channels.airbnb.listings.permits.update('4118', {
      permits: [
        {
          regulatory_body: 'City of Radium Hot Springs',
          regulation_type: 'short_term_rental',
          answers: [{ question_key: 'permit_number', text_value: 'STR-123' }],
        },
      ],
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/permits');
  });

  it('safetyDisclosures.update merges rather than replaces', async () => {
    const { repull, calls } = client({ data: {} });
    await repull.channels.airbnb.listings.safetyDisclosures.update('4118', {
      disclosures: [{ type: 'security_camera', value: false }],
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/safety-disclosures');
    expect(calls[0].body).toEqual({ disclosures: [{ type: 'security_camera', value: false }] });
  });

  it('amenities.update PUTs is_present verdicts', async () => {
    const { repull, calls } = client({ data: { amenities: 1 }, stored: true });
    const res = await repull.channels.airbnb.listings.amenities.update(4118, {
      amenities: [{ id: 'wireless_internet', is_present: true }],
    });
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/amenities');
    expect(res.stored).toBe(true);
  });
});

describe('airbnb photos', () => {
  it('update PATCHes one photo', async () => {
    const { repull, calls } = client({ data: {}, stored: true });
    await repull.channels.airbnb.listings.photos.update('4118', {
      photo_id: 'p1',
      caption: 'Living room',
    });
    expect(calls[0].method).toBe('PATCH');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/photos');
    expect(calls[0].body).toEqual({ photo_id: 'p1', caption: 'Living room' });
  });

  it('order PUTs the full id list to /photos/order', async () => {
    const { repull, calls } = client({ data: { order: [], applied: [], unchanged: 0 }, stored: true });
    await repull.channels.airbnb.listings.photos.order('4118', { photo_ids: ['p2', 'p1'] });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/photos/order');
    expect(calls[0].body).toEqual({ photo_ids: ['p2', 'p1'] });
  });

  it('setCover PUTs to /photos/cover', async () => {
    const { repull, calls } = client({ data: { coverPhotoId: 'p2' }, stored: true });
    const res = await repull.channels.airbnb.listings.photos.setCover(4118, { photo_id: 'p2' });
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/photos/cover');
    expect(res.data?.coverPhotoId).toBe('p2');
  });
});

describe('airbnb rooms', () => {
  it('update sends roomId on the query string, not the body', async () => {
    const { repull, calls } = client({ data: {}, stored: true });
    await repull.channels.airbnb.listings.rooms.update('4118', 'r-7', {
      beds: [{ type: 'king_bed', quantity: 1 }],
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/listings/4118/rooms');
    expect(calls[0].url.searchParams.get('roomId')).toBe('r-7');
    expect(calls[0].body).toEqual({ beds: [{ type: 'king_bed', quantity: 1 }] });
  });
});

describe('airbnb alterations', () => {
  it('cancel POSTs an empty body', async () => {
    const { repull, calls } = client({});
    await repull.channels.airbnb.alterations.cancel('alt-1');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/alterations/alt-1/cancel');
    expect(calls[0].body).toEqual({});
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

describe('v0.2.16 — inquiries, pre-approval, special offers, booking requests, attachments', () => {
  it('conversations.send forwards attachments in the body', async () => {
    const { repull, calls } = client({});
    await repull.conversations.send(164743, {
      message: 'Parking map attached',
      attachments: [{ url: 'https://cdn.example.com/map.jpg', contentType: 'image/jpeg' }],
    });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url.pathname).toBe('/v1/conversations/164743/messages');
    expect(calls[0].body).toEqual({
      message: 'Parking map attached',
      attachments: [{ url: 'https://cdn.example.com/map.jpg', contentType: 'image/jpeg' }],
    });
  });

  it('conversations.preApprove POSTs to /pre-approval with an empty body by default', async () => {
    const { repull, calls } = client({ conversationId: '164743', status: 'pre_approved' }, 201);
    const res = await repull.conversations.preApprove(164743);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url.pathname).toBe('/v1/conversations/164743/pre-approval');
    expect(calls[0].body).toEqual({});
    expect(res.status).toBe('pre_approved');
  });

  it('conversations.specialOffers create / get / withdraw hit the right paths', async () => {
    const { repull, calls } = client({ id: '1459920384', status: 'withdrawn' });
    await repull.conversations.specialOffers.create(164743, {
      checkIn: '2026-10-01',
      checkOut: '2026-10-05',
      guests: { adults: 2 },
      totalPrice: 880,
    });
    await repull.conversations.specialOffers.get(164743, '1459920384');
    await repull.conversations.specialOffers.withdraw(164743, '1459920384');
    expect(calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      'POST /v1/conversations/164743/special-offers',
      'GET /v1/conversations/164743/special-offers/1459920384',
      'DELETE /v1/conversations/164743/special-offers/1459920384',
    ]);
    expect(calls[0].body).toEqual({
      checkIn: '2026-10-01',
      checkOut: '2026-10-05',
      guests: { adults: 2 },
      totalPrice: 880,
    });
  });

  it('reservations.accept / decline answer a booking request', async () => {
    const { repull, calls } = client({ reservationId: '236354', action: 'decline' });
    await repull.reservations.accept(236354);
    await repull.reservations.decline(236354, { reason: 'dates_not_available', message: 'Sorry, taken.' });
    expect(calls[0].url.pathname).toBe('/v1/reservations/236354/accept');
    expect(calls[1].url.pathname).toBe('/v1/reservations/236354/decline');
    expect(calls[1].body).toEqual({ reason: 'dates_not_available', message: 'Sorry, taken.' });
  });

  it('inquiries.list passes filters as query params', async () => {
    const { repull, calls } = client({ data: [], pagination: { nextCursor: null, hasMore: false } });
    await repull.inquiries.list({ status: 'all', listing_id: 23892, limit: 10 });
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url.pathname).toBe('/v1/inquiries');
    expect(calls[0].url.searchParams.get('status')).toBe('all');
    expect(calls[0].url.searchParams.get('listing_id')).toBe('23892');
    expect(calls[0].url.searchParams.get('limit')).toBe('10');
  });
});

describe('channels.airbnb.offers.get', () => {
  it('reads an Airbnb offer by its Airbnb id via ?offerId=', async () => {
    const { repull, calls } = client({});
    await repull.channels.airbnb.offers.get('1459920384');
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url.pathname).toBe('/v1/channels/airbnb/offers');
    expect(calls[0].url.searchParams.get('offerId')).toBe('1459920384');
  });
});
