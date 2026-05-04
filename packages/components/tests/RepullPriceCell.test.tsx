import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RepullPriceCell } from '../src/components/RepullPriceCell.js';
import { makeMockClient } from './_helpers.js';

describe('RepullPriceCell', () => {
  it('renders the recommended price after fetch', async () => {
    const client = makeMockClient({
      pricingGet: async () => ({
        data: [{ date: '2026-05-12', recommendedPrice: 220, currentPrice: 200, compMedian: 210, factors: [] }],
      }),
    });
    render(<RepullPriceCell client={client} listingId="L-1" date="2026-05-12" />);
    await waitFor(() => {
      expect(screen.getByText(/220/)).toBeInTheDocument();
    });
  });

  it('opens the SHAP modal on click and shows top 5 factors sorted by impact', async () => {
    const factors = [
      { factor: 'comp_median', impact: 0.12 },
      { factor: 'lead_time', impact: -0.08 },
      { factor: 'demand', impact: 0.21 },
      { factor: 'seasonality', impact: -0.04 },
      { factor: 'event_signal', impact: 0.18 },
      { factor: 'min_stay', impact: 0.01 },
      { factor: 'review_score', impact: 0.03 },
    ];
    const client = makeMockClient({
      pricingGet: async () => ({
        data: [{ date: '2026-05-12', recommendedPrice: 240, currentPrice: 200, compMedian: 210, factors }],
      }),
    });
    render(<RepullPriceCell client={client} listingId="L-1" date="2026-05-12" />);
    await waitFor(() => screen.getByTestId('repull-price-cell'));
    fireEvent.click(screen.getByTestId('repull-price-cell'));
    await waitFor(() => screen.getByTestId('repull-price-modal'));
    const factorRows = screen.getAllByTestId('repull-price-factor');
    expect(factorRows).toHaveLength(5);
    // Top by abs impact: demand (0.21), event (0.18), comp (0.12), lead (-0.08), seasonality (-0.04)
    expect(factorRows[0]).toHaveTextContent('demand');
    expect(factorRows[1]).toHaveTextContent('event_signal');
    expect(factorRows[2]).toHaveTextContent('comp_median');
  });

  it('falls back to em-dash when no recommendation', async () => {
    const client = makeMockClient({
      pricingGet: async () => ({ data: [] }),
    });
    render(<RepullPriceCell client={client} listingId="L-1" date="2026-05-12" />);
    await waitFor(() => screen.getByTestId('repull-price-cell'));
    expect(screen.getByTestId('repull-price-cell')).toHaveTextContent('—');
  });

  it('shows an empty message when SDK has no pricing namespace', async () => {
    render(<RepullPriceCell client={{}} listingId="L-1" date="2026-05-12" />);
    await waitFor(() => screen.getByTestId('repull-price-cell'));
    expect(screen.getByTestId('repull-price-cell')).toHaveAttribute('title', expect.stringContaining('upgrade to v2-xgboost'));
  });

  it('passes startDate and endDate to the SDK', async () => {
    const fn = vi.fn(async () => ({ data: [] }));
    const client = makeMockClient({ pricingGet: fn });
    render(<RepullPriceCell client={client} listingId="L-99" date="2026-06-15" />);
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(fn).toHaveBeenCalledWith('L-99', { startDate: '2026-06-15', endDate: '2026-06-15' });
  });
});
