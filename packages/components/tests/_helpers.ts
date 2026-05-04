import { vi } from 'vitest';
import type { ListResponseLike, RepullClientLike } from '../src/utils/sdk.js';

/** Build a mock SDK client. Each namespace returns whatever you pass in. */
export function makeMockClient(
  overrides: Partial<{
    reservationsList: (q?: Record<string, unknown>) => Promise<ListResponseLike<unknown>>;
    listingsList: (q?: Record<string, unknown>) => Promise<ListResponseLike<unknown>>;
    listingsGet: (id: string | number) => Promise<unknown>;
    guestsList: (q?: Record<string, unknown>) => Promise<ListResponseLike<unknown>>;
    guestsGet: (id: string | number) => Promise<unknown>;
    paymentsList: (q?: Record<string, unknown>) => Promise<ListResponseLike<unknown>>;
    paymentsConnectStatus: () => Promise<unknown>;
    paymentsConnect: (b?: Record<string, unknown>) => Promise<unknown>;
    paymentsDisconnect: () => Promise<unknown>;
    tasksList: (q?: Record<string, unknown>) => Promise<ListResponseLike<unknown>>;
    pricingGet: (
      listingId: string | number,
      query?: { startDate?: string; endDate?: string },
    ) => Promise<unknown>;
  }> = {},
): RepullClientLike {
  return {
    reservations: {
      list: overrides.reservationsList
        ? vi.fn(overrides.reservationsList)
        : vi.fn(async () => ({ data: [], pagination: { hasMore: false } })),
    },
    listings: {
      list: overrides.listingsList
        ? vi.fn(overrides.listingsList)
        : vi.fn(async () => ({ data: [], pagination: { hasMore: false } })),
      get: overrides.listingsGet ? vi.fn(overrides.listingsGet) : undefined,
      pricing: {
        get: overrides.pricingGet ? vi.fn(overrides.pricingGet) : undefined,
      },
    },
    guests: {
      list: overrides.guestsList
        ? vi.fn(overrides.guestsList)
        : vi.fn(async () => ({ data: [], pagination: { hasMore: false } })),
      get: overrides.guestsGet ? vi.fn(overrides.guestsGet) : undefined,
    },
    properties: {
      list: vi.fn(async () => ({ data: [], pagination: { hasMore: false } })),
    },
    payments: {
      list: overrides.paymentsList
        ? vi.fn(overrides.paymentsList)
        : vi.fn(async () => ({ data: [], pagination: { hasMore: false } })),
      connectStatus: overrides.paymentsConnectStatus
        ? vi.fn(overrides.paymentsConnectStatus)
        : undefined,
      connect: overrides.paymentsConnect ? vi.fn(overrides.paymentsConnect) : undefined,
      disconnect: overrides.paymentsDisconnect
        ? vi.fn(overrides.paymentsDisconnect)
        : undefined,
    },
    tasks: {
      list: overrides.tasksList
        ? vi.fn(overrides.tasksList)
        : vi.fn(async () => ({ data: [], pagination: { hasMore: false } })),
    },
  };
}
