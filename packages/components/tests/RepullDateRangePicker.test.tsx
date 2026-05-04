import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RepullDateRangePicker, DEFAULT_PRESETS } from '../src/components/RepullDateRangePicker.js';

describe('RepullDateRangePicker', () => {
  it('exposes 6 default presets', () => {
    expect(DEFAULT_PRESETS).toHaveLength(6);
    const labels = DEFAULT_PRESETS.map((p) => p.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Today', 'Yesterday', 'This Week', 'This Month', 'Last 30d', 'YTD']),
    );
  });

  it('opens the menu when trigger is clicked', () => {
    render(<RepullDateRangePicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByTestId('repull-date-range-trigger'));
    expect(screen.getByTestId('repull-date-range-menu')).toBeInTheDocument();
  });

  it('calls onChange with a preset value', () => {
    const onChange = vi.fn();
    render(<RepullDateRangePicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('repull-date-range-trigger'));
    const presets = screen.getAllByTestId('repull-date-range-preset');
    fireEvent.click(presets[0]); // Today
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(arg.to).toBe(arg.from);
  });

  it('shows the formatted range in the trigger button', () => {
    render(
      <RepullDateRangePicker
        value={{ from: '2026-05-01', to: '2026-05-07' }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('2026-05-01 → 2026-05-07')).toBeInTheDocument();
  });

  it('emits onChange when a manual From date is typed', () => {
    const onChange = vi.fn();
    render(
      <RepullDateRangePicker
        value={{ from: '2026-05-01', to: '2026-05-07' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('repull-date-range-trigger'));
    const fromInput = screen.getByLabelText('From');
    fireEvent.change(fromInput, { target: { value: '2026-04-15' } });
    expect(onChange).toHaveBeenCalledWith({ from: '2026-04-15', to: '2026-05-07' });
  });

  it('honors a custom presets prop', () => {
    const custom = [
      {
        label: 'Last 7d',
        build: () => ({ from: '2026-04-25', to: '2026-05-02' }),
      },
    ];
    render(<RepullDateRangePicker value={null} onChange={() => {}} presets={custom} />);
    fireEvent.click(screen.getByTestId('repull-date-range-trigger'));
    const presets = screen.getAllByTestId('repull-date-range-preset');
    expect(presets).toHaveLength(1);
    expect(presets[0]).toHaveTextContent('Last 7d');
  });
});
