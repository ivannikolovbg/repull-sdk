import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RepullPDFExport } from '../src/components/RepullPDFExport.js';

describe('RepullPDFExport', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:fake');
    revokeObjectURL = vi.fn();
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });
  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('renders a button with a friendly label', () => {
    render(<RepullPDFExport template="owner-statement" data={{}} />);
    expect(screen.getByRole('button')).toHaveTextContent(/owner statement/i);
  });

  it('builds a blob URL on click', async () => {
    const onDownload = vi.fn();
    render(
      <RepullPDFExport
        template="owner-statement"
        data={{ ownerName: 'Jane', month: '2026-04', listings: [] }}
        onDownload={onDownload}
        autoDownload={false}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onDownload).toHaveBeenCalled());
    expect(onDownload).toHaveBeenCalledWith('blob:fake');
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('uses the customRenderer when supplied', async () => {
    const customRenderer = vi.fn(async () => new Blob(['x'], { type: 'application/pdf' }));
    render(
      <RepullPDFExport
        template="cleaning-rota"
        data={{ tasks: [] }}
        customRenderer={customRenderer}
        autoDownload={false}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(customRenderer).toHaveBeenCalledTimes(1));
    expect(customRenderer).toHaveBeenCalledWith('cleaning-rota', { tasks: [] });
  });

  it('shows error message when renderer throws', async () => {
    const customRenderer = vi.fn().mockRejectedValue(new Error('boom'));
    render(
      <RepullPDFExport
        template="welcome-pack"
        data={{}}
        customRenderer={customRenderer}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
  });

  it('supports all 3 templates without crashing', async () => {
    const onDownload = vi.fn();
    for (const template of ['owner-statement', 'cleaning-rota', 'welcome-pack'] as const) {
      const { unmount } = render(
        <RepullPDFExport template={template} data={{}} onDownload={onDownload} autoDownload={false} />,
      );
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => expect(onDownload).toHaveBeenCalled());
      onDownload.mockClear();
      unmount();
    }
  });
});
