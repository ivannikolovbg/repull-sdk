/**
 * @repull/components — pre-tested React primitives that wrap @repull/sdk.
 *
 * The Repull-Studio agent (and any embedded app) gets a typed, safe set
 * of building blocks instead of having to compose data-fetching from
 * scratch. Every component:
 *
 *   - Talks ONLY to a `@repull/sdk` client passed in via the `client` prop.
 *   - Renders a polished skeleton while loading.
 *   - Renders a customer-facing empty state when there's nothing to show.
 *   - Surfaces errors inline (no silent failures, no stack traces in UI).
 *
 * Read the package README for the SDK-only constraint and the full
 * usage matrix.
 */

export { RepullDataTable } from './components/RepullDataTable.js';
export type {
  DataTableColumn,
  RepullDataTableProps,
} from './components/RepullDataTable.js';

export { RepullCalendar } from './components/RepullCalendar.js';
export type { RepullCalendarProps } from './components/RepullCalendar.js';

export { RepullPropertyPicker } from './components/RepullPropertyPicker.js';
export type { RepullPropertyPickerProps } from './components/RepullPropertyPicker.js';

export {
  RepullDateRangePicker,
  DEFAULT_PRESETS,
} from './components/RepullDateRangePicker.js';
export type {
  RepullDateRangePickerProps,
  DateRange,
  DateRangePreset,
} from './components/RepullDateRangePicker.js';

export { RepullGuestProfile } from './components/RepullGuestProfile.js';
export type { RepullGuestProfileProps } from './components/RepullGuestProfile.js';

export { RepullPriceCell } from './components/RepullPriceCell.js';
export type { RepullPriceCellProps } from './components/RepullPriceCell.js';

export { RepullPDFExport } from './components/RepullPDFExport.js';
export type {
  RepullPDFExportProps,
  PDFTemplate,
} from './components/RepullPDFExport.js';

export { RepullStripePayoutWidget } from './components/RepullStripePayoutWidget.js';
export type { RepullStripePayoutWidgetProps } from './components/RepullStripePayoutWidget.js';

export type {
  DataTableResource,
  RepullClientLike,
  ListResponseLike,
} from './utils/sdk.js';

export { cn } from './utils/cn.js';
export { toCSV, downloadCSV } from './utils/csv.js';
