import * as React from 'react';
import { Calendar } from 'lucide-react';
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';
import { cn } from '../utils/cn.js';

/**
 * @example
 * ```tsx
 * import { RepullDateRangePicker } from '@repull/components/RepullDateRangePicker';
 *
 * const [range, setRange] = useState<{ from: string; to: string } | null>(null);
 * <RepullDateRangePicker value={range} onChange={setRange} />
 * ```
 */

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface DateRangePreset {
  label: string;
  build: () => DateRange;
}

export interface RepullDateRangePickerProps {
  value: DateRange | null;
  onChange: (next: DateRange) => void;
  presets?: DateRangePreset[];
  className?: string;
}

const fmt = (d: Date): string => format(d, 'yyyy-MM-dd');

export const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    label: 'Today',
    build: () => {
      const today = new Date();
      return { from: fmt(today), to: fmt(today) };
    },
  },
  {
    label: 'Yesterday',
    build: () => {
      const y = subDays(new Date(), 1);
      return { from: fmt(y), to: fmt(y) };
    },
  },
  {
    label: 'This Week',
    build: () => ({
      from: fmt(startOfWeek(new Date(), { weekStartsOn: 1 })),
      to: fmt(endOfWeek(new Date(), { weekStartsOn: 1 })),
    }),
  },
  {
    label: 'This Month',
    build: () => ({
      from: fmt(startOfMonth(new Date())),
      to: fmt(endOfMonth(new Date())),
    }),
  },
  {
    label: 'Last 30d',
    build: () => ({
      from: fmt(subDays(new Date(), 29)),
      to: fmt(new Date()),
    }),
  },
  {
    label: 'YTD',
    build: () => ({
      from: fmt(startOfYear(new Date())),
      to: fmt(endOfYear(new Date())),
    }),
  },
];

export function RepullDateRangePicker({
  value,
  onChange,
  presets,
  className,
}: RepullDateRangePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const activePresets = presets ?? DEFAULT_PRESETS;

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label = value
    ? `${value.from} → ${value.to}`
    : 'Pick a date range';

  const applyPreset = (p: DateRangePreset): void => {
    onChange(p.build());
    setOpen(false);
  };

  const handleManualChange = (key: 'from' | 'to', next: string): void => {
    const base: DateRange = value ?? { from: fmt(new Date()), to: fmt(new Date()) };
    onChange({ ...base, [key]: next });
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="repull-date-range-trigger"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/80 dark:hover:bg-white/[0.04]"
      >
        <Calendar size={14} />
        <span>{label}</span>
      </button>

      {open && (
        <div
          data-testid="repull-date-range-menu"
          className="absolute left-0 top-full z-50 mt-1 flex gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-white/[0.08] dark:bg-[#141414]"
        >
          <div className="flex flex-col gap-1">
            {activePresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                data-testid="repull-date-range-preset"
                className="rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/[0.06]"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex min-w-[12rem] flex-col gap-2 border-l border-gray-200 pl-3 dark:border-white/[0.06]">
            <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-white/60">
              From
              <input
                type="date"
                value={value?.from ?? ''}
                onChange={(e) => handleManualChange('from', e.target.value)}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/80"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-white/60">
              To
              <input
                type="date"
                value={value?.to ?? ''}
                onChange={(e) => handleManualChange('to', e.target.value)}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/80"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
