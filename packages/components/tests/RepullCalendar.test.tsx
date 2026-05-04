import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RepullCalendar } from '../src/components/RepullCalendar.js';
import { makeMockClient } from './_helpers.js';

describe('RepullCalendar', () => {
  it('renders a row per listing and a column per day', async () => {
    const client = makeMockClient({
      listingsList: async () => ({
        data: [
          { id: 'L-1', title: 'Sea View 4B' },
          { id: 'L-2', title: 'Garden Loft' },
        ],
        pagination: { hasMore: false },
      }),
      reservationsList: async () => ({
        data: [],
        pagination: { hasMore: false },
      }),
    });

    render(
      <RepullCalendar
        client={client}
        mode="listings"
        from="2026-05-01"
        to="2026-05-03"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Sea View 4B')).toBeInTheDocument();
    });
    // 2 listings × 3 days = 6 cells
    expect(screen.getAllByTestId('repull-calendar-cell')).toHaveLength(6);
  });

  it('marks reserved cells', async () => {
    const client = makeMockClient({
      listingsList: async () => ({
        data: [{ id: 'L-1', title: 'Sea View 4B' }],
        pagination: { hasMore: false },
      }),
      reservationsList: async () => ({
        data: [
          { id: 'R-1', listingId: 'L-1', startDate: '2026-05-02', endDate: '2026-05-04', status: 'confirmed' },
        ],
        pagination: { hasMore: false },
      }),
    });

    render(
      <RepullCalendar
        client={client}
        mode="reservations"
        from="2026-05-01"
        to="2026-05-04"
      />,
    );

    await waitFor(() => screen.getAllByTestId('repull-calendar-cell'));
    const cells = screen.getAllByTestId('repull-calendar-cell');
    // 4 days, day 0 = 05-01 (free), day 1 = 05-02 (reserved), day 2 = 05-03 (reserved), day 3 = 05-04 (free, end is exclusive)
    expect(cells[0]).toHaveAttribute('data-reserved', 'false');
    expect(cells[1]).toHaveAttribute('data-reserved', 'true');
    expect(cells[2]).toHaveAttribute('data-reserved', 'true');
    expect(cells[3]).toHaveAttribute('data-reserved', 'false');
  });

  it('fires onCellClick with listingId + date', async () => {
    const onCellClick = vi.fn();
    const client = makeMockClient({
      listingsList: async () => ({
        data: [{ id: 'L-1', title: 'Sea View 4B' }],
        pagination: { hasMore: false },
      }),
    });

    render(
      <RepullCalendar
        client={client}
        mode="listings"
        from="2026-05-01"
        to="2026-05-01"
        onCellClick={onCellClick}
      />,
    );

    await waitFor(() => screen.getAllByTestId('repull-calendar-cell'));
    fireEvent.click(screen.getAllByTestId('repull-calendar-cell')[0]);
    expect(onCellClick).toHaveBeenCalledWith({ listingId: 'L-1', date: '2026-05-01' });
  });

  it('renders the empty state when no listings come back', async () => {
    const client = makeMockClient({
      listingsList: async () => ({ data: [], pagination: { hasMore: false } }),
    });
    render(
      <RepullCalendar
        client={client}
        mode="listings"
        from="2026-05-01"
        to="2026-05-03"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Pick a date range/i)).toBeInTheDocument();
    });
  });

  it('filters listings by listingIds prop', async () => {
    const client = makeMockClient({
      listingsList: async () => ({
        data: [
          { id: 'L-1', title: 'A' },
          { id: 'L-2', title: 'B' },
          { id: 'L-3', title: 'C' },
        ],
        pagination: { hasMore: false },
      }),
    });
    render(
      <RepullCalendar
        client={client}
        mode="listings"
        listingIds={['L-2']}
        from="2026-05-01"
        to="2026-05-01"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('B')).toBeInTheDocument();
    });
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
  });
});
