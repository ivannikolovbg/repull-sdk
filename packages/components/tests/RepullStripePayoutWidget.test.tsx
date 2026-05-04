import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RepullStripePayoutWidget } from '../src/components/RepullStripePayoutWidget.js';
import { makeMockClient } from './_helpers.js';

describe('RepullStripePayoutWidget', () => {
  it('renders Connect button when not connected', async () => {
    const client = makeMockClient({
      paymentsConnectStatus: async () => ({ connected: false }),
    });
    render(<RepullStripePayoutWidget client={client} />);
    await waitFor(() =>
      expect(screen.getByTestId('repull-stripe-connect-button')).toBeInTheDocument(),
    );
  });

  it('renders payout details when connected', async () => {
    const client = makeMockClient({
      paymentsConnectStatus: async () => ({
        connected: true,
        accountId: 'acct_123',
        payoutsEnabled: true,
        defaultCurrency: 'USD',
        pendingPayout: 1234.56,
        nextPayoutDate: '2026-05-10',
      }),
    });
    render(<RepullStripePayoutWidget client={client} />);
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument();
    expect(screen.getByText('2026-05-10')).toBeInTheDocument();
    expect(screen.getByText(/acct_123/)).toBeInTheDocument();
  });

  it('calls onConnect with returned URL', async () => {
    const onConnect = vi.fn();
    const client = makeMockClient({
      paymentsConnectStatus: async () => ({ connected: false }),
      paymentsConnect: async () => ({ url: 'https://connect.stripe.com/oauth/authorize?x=1' }),
    });
    render(<RepullStripePayoutWidget client={client} onConnect={onConnect} />);
    await waitFor(() => screen.getByTestId('repull-stripe-connect-button'));
    fireEvent.click(screen.getByTestId('repull-stripe-connect-button'));
    await waitFor(() => expect(onConnect).toHaveBeenCalled());
    expect(onConnect).toHaveBeenCalledWith('https://connect.stripe.com/oauth/authorize?x=1');
  });

  it('calls onDisconnect after a successful disconnect', async () => {
    const onDisconnect = vi.fn();
    let connected = true;
    const client = makeMockClient({
      paymentsConnectStatus: async () => ({ connected, accountId: 'acct_x', payoutsEnabled: true }),
      paymentsDisconnect: async () => {
        connected = false;
        return { ok: true };
      },
    });
    render(<RepullStripePayoutWidget client={client} onDisconnect={onDisconnect} />);
    await waitFor(() => screen.getByTestId('repull-stripe-disconnect-button'));
    fireEvent.click(screen.getByTestId('repull-stripe-disconnect-button'));
    await waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  });

  it('renders an error envelope when SDK has no payments namespace', async () => {
    render(<RepullStripePayoutWidget client={{}} />);
    await waitFor(() => {
      expect(
        screen.getByText(/This SDK build does not expose payments\.connectStatus/i),
      ).toBeInTheDocument();
    });
  });

  it('warns when payouts are not yet enabled', async () => {
    const client = makeMockClient({
      paymentsConnectStatus: async () => ({
        connected: true,
        payoutsEnabled: false,
        accountId: 'acct_pending',
      }),
    });
    render(<RepullStripePayoutWidget client={client} />);
    await waitFor(() => {
      expect(screen.getByText(/Stripe needs a few more details/i)).toBeInTheDocument();
    });
  });
});
