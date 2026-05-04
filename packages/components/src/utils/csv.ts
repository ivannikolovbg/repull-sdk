/** Convert an array of records into RFC-4180 CSV. */
export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(escape).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(',')).join('\n');
  return body ? `${header}\n${body}` : header;
}

/** Trigger a CSV download in the browser. SSR-safe (no-op in node). */
export function downloadCSV(filename: string, csv: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
