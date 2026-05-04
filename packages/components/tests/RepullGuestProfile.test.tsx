import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RepullGuestProfile } from '../src/components/RepullGuestProfile.js';
import { makeMockClient } from './_helpers.js';

describe('RepullGuestProfile', () => {
  it('shows skeleton while loading', async () => {
    let resolve: () => void = () => {};
    const client = makeMockClient({
      guestsGet: () => new Promise<unknown>((r) => {
        resolve = () => r({ id: 'G-1', name: 'Jane' });
      }),
    });
    render(<RepullGuestProfile client={client} guestId="G-1" />);
    expect(screen.getByTestId('repull-guest-profile')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
    // Resolve so the test cleans up without React act warnings.
    resolve();
    await waitFor(() => expect(screen.getByText('Jane')).toBeInTheDocument());
  });

  it('renders guest contact + revenue summary', async () => {
    const client = makeMockClient({
      guestsGet: async () => ({
        id: 'G-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1-555-0100',
      }),
      reservationsList: async () => ({
        data: [
          { id: 'R-1', startDate: '2026-04-01', endDate: '2026-04-04', totalAmount: 400, currency: 'USD' },
          { id: 'R-2', startDate: '2026-04-10', endDate: '2026-04-13', totalAmount: 300, currency: 'USD' },
        ],
        pagination: { hasMore: false },
      }),
    });
    render(<RepullGuestProfile client={client} guestId="G-1" />);

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0100')).toBeInTheDocument();
    // Total revenue = 700 USD
    expect(screen.getByText(/\$700/)).toBeInTheDocument();
  });

  it('displays a Repeat badge when guest has 2+ stays', async () => {
    const client = makeMockClient({
      guestsGet: async () => ({ id: 'G-1', name: 'Jane' }),
      reservationsList: async () => ({
        data: [
          { id: 'R-1', startDate: '2026-04-01', endDate: '2026-04-04' },
          { id: 'R-2', startDate: '2026-04-10', endDate: '2026-04-13' },
        ],
        pagination: { hasMore: false },
      }),
    });
    render(<RepullGuestProfile client={client} guestId="G-1" />);
    await waitFor(() => screen.getByTestId('repull-guest-repeat-badge'));
    expect(screen.getByTestId('repull-guest-repeat-badge')).toBeInTheDocument();
  });

  it('renders an empty-stay message when reservation list is empty', async () => {
    const client = makeMockClient({
      guestsGet: async () => ({ id: 'G-1', name: 'Jane' }),
      reservationsList: async () => ({ data: [], pagination: { hasMore: false } }),
    });
    render(<RepullGuestProfile client={client} guestId="G-1" />);
    await waitFor(() => screen.getByText('Jane'));
    expect(screen.getByText(/No stays on record yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('repull-guest-repeat-badge')).not.toBeInTheDocument();
  });

  it('shows error when guest fetch fails', async () => {
    const client = makeMockClient({
      guestsGet: vi.fn().mockRejectedValue(new Error('not found')),
      reservationsList: async () => ({ data: [], pagination: { hasMore: false } }),
    });
    render(<RepullGuestProfile client={client} guestId="G-bogus" />);
    await waitFor(() => {
      expect(screen.getByText(/not found|Guest not found/i)).toBeInTheDocument();
    });
  });
});
