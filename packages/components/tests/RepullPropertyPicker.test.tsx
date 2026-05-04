import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RepullPropertyPicker } from '../src/components/RepullPropertyPicker.js';
import { makeMockClient } from './_helpers.js';

describe('RepullPropertyPicker', () => {
  it('lazy-loads listings only after open', async () => {
    const list = vi.fn(async () => ({
      data: [{ id: 'L-1', title: 'A' }],
      pagination: { hasMore: false },
    }));
    const client = makeMockClient({ listingsList: list });

    const onChange = vi.fn();
    render(<RepullPropertyPicker client={client} value={null} onChange={onChange} />);

    expect(list).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('repull-property-picker-trigger'));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
  });

  it('selects a listing in single-mode and calls onChange', async () => {
    const onChange = vi.fn();
    const client = makeMockClient({
      listingsList: async () => ({
        data: [{ id: 'L-1', title: 'Sea View' }],
        pagination: { hasMore: false },
      }),
    });
    render(<RepullPropertyPicker client={client} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('repull-property-picker-trigger'));
    await waitFor(() => screen.getByTestId('repull-property-picker-option'));
    fireEvent.click(screen.getByTestId('repull-property-picker-option'));
    expect(onChange).toHaveBeenCalledWith('L-1');
  });

  it('toggles selection in multi-mode', async () => {
    const onChange = vi.fn();
    const client = makeMockClient({
      listingsList: async () => ({
        data: [
          { id: 'L-1', title: 'A' },
          { id: 'L-2', title: 'B' },
        ],
        pagination: { hasMore: false },
      }),
    });
    render(
      <RepullPropertyPicker client={client} multi value={['L-1']} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTestId('repull-property-picker-trigger'));
    await waitFor(() => screen.getAllByTestId('repull-property-picker-option'));
    const opts = screen.getAllByTestId('repull-property-picker-option');
    // Click the second option
    fireEvent.click(opts[1]);
    expect(onChange).toHaveBeenCalledWith(['L-1', 'L-2']);
  });

  it('filters options by query', async () => {
    const client = makeMockClient({
      listingsList: async () => ({
        data: [
          { id: 'L-1', title: 'Sea View' },
          { id: 'L-2', title: 'Garden Loft' },
        ],
        pagination: { hasMore: false },
      }),
    });
    render(<RepullPropertyPicker client={client} value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByTestId('repull-property-picker-trigger'));
    await waitFor(() => screen.getAllByTestId('repull-property-picker-option'));

    const search = screen.getByPlaceholderText('Search listings');
    fireEvent.change(search, { target: { value: 'sea' } });
    const opts = screen.getAllByTestId('repull-property-picker-option');
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent('Sea View');
  });

  it('renders an error when SDK has no listings namespace', async () => {
    render(
      <RepullPropertyPicker client={{}} value={null} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('repull-property-picker-trigger'));
    await waitFor(() => {
      expect(screen.getByText(/No listing access/i)).toBeInTheDocument();
    });
  });
});
