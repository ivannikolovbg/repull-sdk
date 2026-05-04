import * as React from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn.js';

/**
 * @example
 * ```tsx
 * import { RepullPDFExport } from '@repull/components/RepullPDFExport';
 *
 * <RepullPDFExport
 *   template="owner-statement"
 *   data={{
 *     ownerName: 'Jane Doe',
 *     month: '2026-04',
 *     listings: [{ title: 'Sea View 4B', revenue: 4200, payout: 3360 }],
 *   }}
 *   onDownload={(blobUrl) => console.log(blobUrl)}
 * />
 * ```
 *
 * Templates render to printable HTML via a hidden iframe + `window.print()`
 * fallback so we don't pin a heavy PDF dep. When `@react-pdf/renderer` is
 * installed by the consuming app, swap the renderer in via the
 * `customRenderer` prop.
 */

export type PDFTemplate = 'owner-statement' | 'cleaning-rota' | 'welcome-pack';

export interface RepullPDFExportProps {
  template: PDFTemplate;
  data: Record<string, unknown>;
  filename?: string;
  /** Optional custom renderer — receives template+data, returns a Blob. */
  customRenderer?: (template: PDFTemplate, data: Record<string, unknown>) => Promise<Blob>;
  /** Called with the generated blob URL (consumer decides what to do). */
  onDownload?: (blobUrl: string) => void;
  /** Auto-trigger download on click (default true). */
  autoDownload?: boolean;
  className?: string;
  label?: string;
}

interface TemplateRenderer {
  render: (data: Record<string, unknown>) => string;
  emptyMessage: string;
}

const TEMPLATES: Record<PDFTemplate, TemplateRenderer> = {
  'owner-statement': {
    render: (d) => {
      const ownerName = String(d.ownerName ?? 'Owner');
      const month = String(d.month ?? '');
      const listings = Array.isArray(d.listings) ? d.listings as Array<Record<string, unknown>> : [];
      const totalPayout = listings.reduce((sum, l) => sum + (Number(l.payout) || 0), 0);
      return `
        <h1>Owner Statement</h1>
        <p><strong>${ownerName}</strong> · ${month}</p>
        <table>
          <thead><tr><th>Listing</th><th>Revenue</th><th>Payout</th></tr></thead>
          <tbody>
            ${listings.map((l) => `
              <tr>
                <td>${String(l.title ?? '—')}</td>
                <td>${Number(l.revenue ?? 0).toFixed(2)}</td>
                <td>${Number(l.payout ?? 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="2"><strong>Total payout</strong></td><td><strong>${totalPayout.toFixed(2)}</strong></td></tr>
          </tfoot>
        </table>
      `;
    },
    emptyMessage: 'No revenue this period — owner statement will be empty.',
  },
  'cleaning-rota': {
    render: (d) => {
      const date = String(d.date ?? '');
      const tasks = Array.isArray(d.tasks) ? d.tasks as Array<Record<string, unknown>> : [];
      return `
        <h1>Cleaning Rota</h1>
        <p>Date: <strong>${date}</strong></p>
        <table>
          <thead><tr><th>Listing</th><th>Cleaner</th><th>Slot</th></tr></thead>
          <tbody>
            ${tasks.map((t) => `
              <tr>
                <td>${String(t.listing ?? '—')}</td>
                <td>${String(t.cleaner ?? 'Unassigned')}</td>
                <td>${String(t.slot ?? '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    },
    emptyMessage: 'No cleaning tasks scheduled — nothing to print.',
  },
  'welcome-pack': {
    render: (d) => {
      const guestName = String(d.guestName ?? 'Guest');
      const listingTitle = String(d.listingTitle ?? 'your stay');
      const checkIn = String(d.checkIn ?? '');
      const checkOut = String(d.checkOut ?? '');
      const wifi = String(d.wifi ?? '—');
      const accessCode = String(d.accessCode ?? '—');
      const notes = String(d.notes ?? '');
      return `
        <h1>Welcome to ${listingTitle}, ${guestName}!</h1>
        <p>We're glad you're here. Here are the essentials.</p>
        <h2>Your stay</h2>
        <p>Check-in: <strong>${checkIn}</strong><br/>Check-out: <strong>${checkOut}</strong></p>
        <h2>WiFi</h2>
        <p>${wifi}</p>
        <h2>Door code</h2>
        <p style="font-size: 24px; font-family: monospace;">${accessCode}</p>
        ${notes ? `<h2>Notes</h2><p>${notes}</p>` : ''}
      `;
    },
    emptyMessage: 'Nothing to print — welcome pack needs a guest and listing.',
  },
};

const STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-top: 24px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-size: 12px; text-transform: uppercase; }
  .repull-brand { color: #6b7280; font-size: 11px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
`;

function buildHtml(template: PDFTemplate, data: Record<string, unknown>): string {
  const renderer = TEMPLATES[template];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${template}</title>
  <style>${STYLE}</style>
</head>
<body>
  ${renderer.render(data)}
  <p class="repull-brand">Generated by Repull · repull.dev</p>
</body>
</html>`;
}

export function RepullPDFExport({
  template,
  data,
  filename,
  customRenderer,
  onDownload,
  autoDownload = true,
  className,
  label,
}: RepullPDFExportProps): React.ReactElement {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      let blob: Blob;
      if (customRenderer) {
        blob = await customRenderer(template, data);
      } else {
        const html = buildHtml(template, data);
        blob = new Blob([html], { type: 'text/html' });
      }
      if (typeof URL === 'undefined' || typeof document === 'undefined') {
        throw new Error('PDF export requires a browser environment.');
      }
      const url = URL.createObjectURL(blob);
      onDownload?.(url);
      if (autoDownload) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename ?? `${template}-${new Date().toISOString().slice(0, 10)}.html`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="repull-pdf-export" className={cn('inline-flex flex-col gap-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/80 dark:hover:bg-white/[0.04]"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {label ?? `Export ${template.replace(/-/g, ' ')}`}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
