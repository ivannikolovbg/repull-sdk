import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RepullDataTable } from '../src/components/RepullDataTable.js';
import { makeMockClient } from './_helpers.js';

describe('RepullDataTable', () => {
  it('calls the right SDK namespace with filters and pageSize', async () => {
    const list = vi.fn(async () => ({ data: [], pagination: { hasMore: false } }));
    const client = makeMockClient({ reservationsList: list });

    render(
      <RepullDataTable
        client={client}
        resource="reservations"
        filters={{ status: 'confirmed' }}
        pageSize={50}
      />,
    );

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', limit: 50 }),
    );
  });

  it('renders rows once data resolves', async () => {
    const client = makeMockClient({
      reservationsList: async () => ({
        data: [
          { id: 'R-1', status: 'confirmed', startDate: '2026-05-01', endDate: '2026-05-04', totalAmount: 320 },
          { id: 'R-2', status: 'pending', startDate: '2026-05-10', endDate: '2026-05-12', totalAmount: 180 },
        ],
        pagination: { hasMore: false },
      }),
    });

    render(<RepullDataTable client={client} resource="reservations" />);

    await waitFor(() => {
      expect(screen.getAllByTestId('repull-data-table-row')).toHaveLength(2);
    });
    expect(screen.getByText('R-1')).toBeInTheDocument();
    expect(screen.getByText('R-2')).toBeInTheDocument();
  });

  it('renders the empty-state copy when there are no rows', async () => {
    const client = makeMockClient({
      listingsList: async () => ({ data: [], pagination: { hasMore: false } }),
    });
    render(<RepullDataTable client={client} resource="listings" />);
    await waitFor(() => {
      expect(screen.getByText(/No listings to show/i)).toBeInTheDocument();
    });
  });

  it('removes a filter chip when X is clicked', async () => {
    const client = makeMockClient({
      reservationsList: async () => ({
        data: [{ id: 'R-1' }],
        pagination: { hasMore: false },
      }),
    });
    render(
      <RepullDataTable
        client={client}
        resource="reservations"
        filters={{ status: 'confirmed' }}
      />,
    );
    await waitFor(() => expect(screen.getByText('confirmed')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Remove status filter/i));
    await waitFor(() => {
      expect(screen.queryByText('confirmed')).not.toBeInTheDocument();
    });
  });

  it('shows an error message when the SDK list method does not exist', async () => {
    // Empty client — `tasks` is not present.
    const client = { /* nothing */ };
    render(<RepullDataTable client={client} resource="tasks" />);
    await waitFor(() => {
      expect(
        screen.getByText(/This SDK build does not expose tasks\.list/i),
      ).toBeInTheDocument();
    });
  });

  it('reacts to a sort click on a sortable column', async () => {
    const client = makeMockClient({
      reservationsList: async () => ({
        data: [
          { id: 'R-1', status: 'pending' },
          { id: 'R-2', status: 'confirmed' },
        ],
        pagination: { hasMore: false },
      }),
    });
    render(<RepullDataTable client={client} resource="reservations" />);
    await waitFor(() => screen.getAllByTestId('repull-data-table-row'));
    // Initial server order: R-1 (pending), R-2 (confirmed)
    expect(screen.getAllByTestId('repull-data-table-row')[0]).toHaveTextContent('R-1');
    // Click Status → sort asc by status: confirmed < pending alphabetically, so R-2 comes first
    fireEvent.click(screen.getByText('Status'));
    const rows = screen.getAllByTestId('repull-data-table-row');
    expect(rows[0]).toHaveTextContent('R-2');
    expect(rows[1]).toHaveTextContent('R-1');
  });
});
