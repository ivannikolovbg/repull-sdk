# @repull/components

Pre-tested React primitives that wrap [`@repull/sdk`](../sdk). The safe set of building blocks the Repull-Studio agent (and any embedded app) reaches for instead of generating data-fetching from scratch.

## Why this exists

Generating code that talks to vacation-rental APIs is the worst possible thing to ask an LLM. It will hallucinate field names, get pagination wrong, ship rate-limit footguns, miss the `xSchema` option, or — worst — wire up a competing channel manager because it saw one once in training data.

`@repull/components` solves that by handing the agent a **typed, safe, opinionated set of primitives** that:

- Talk **only** to a `@repull/sdk` client (no parallel HTTP fetches, no other channel managers).
- Render a polished skeleton while loading.
- Render customer-facing empty-state copy when there's nothing to show.
- Surface errors inline (no silent failures, no stack traces in UI).
- Are responsive by default.
- Carry behavioural unit tests so a regression in the SDK contract is caught at component-test time, not at runtime.

> Customer principle: "We should basically limit Kimi to creating anything just using our SDK so no outside channel managers."

## Install

```bash
pnpm add @repull/components @repull/sdk react react-dom
```

`react ^19`, `react-dom ^19`, and `@repull/sdk` are peer dependencies.

## Usage

Every component takes a `client` prop — pass the same `Repull` instance you use elsewhere.

```tsx
import { Repull } from '@repull/sdk';
import { RepullDataTable } from '@repull/components';

const repull = new Repull({ apiKey: process.env.REPULL_API_KEY });

export function RecentReservations() {
  return (
    <RepullDataTable
      client={repull}
      resource="reservations"
      filters={{ status: 'confirmed' }}
      pageSize={50}
    />
  );
}
```

## The 8 primitives

### `<RepullDataTable>`

Generic table bound to any SDK list endpoint. Filter chips, sortable columns, pagination, and one-click CSV export are pre-built.

```tsx
<RepullDataTable
  client={repull}
  resource="reservations" // or 'listings' | 'guests' | 'payments' | 'tasks'
  filters={{ status: 'confirmed', listingId: 'L-99' }}
  pageSize={50}
  onRowClick={(row) => router.push(`/r/${row.id}`)}
/>
```

### `<RepullCalendar>`

Listings × dates grid. Click a cell to drill into a date.

```tsx
<RepullCalendar
  client={repull}
  mode="listings"
  from="2026-05-01"
  to="2026-05-31"
  onCellClick={({ listingId, date }) => openInspector(listingId, date)}
/>
```

### `<RepullPropertyPicker>`

Listing search/select dropdown. Lazy-loads on first open, supports single or multi.

```tsx
const [listingIds, setListingIds] = useState<string[]>([]);

<RepullPropertyPicker client={repull} multi value={listingIds} onChange={setListingIds} />;
```

### `<RepullDateRangePicker>`

Date range with 6 presets (Today, Yesterday, This Week, This Month, Last 30d, YTD). Manual From/To inputs included.

```tsx
const [range, setRange] = useState({ from: '2026-05-01', to: '2026-05-07' });
<RepullDateRangePicker value={range} onChange={setRange} />;
```

### `<RepullGuestProfile>`

Detail panel: contact info, stay history, total revenue, repeat-booker badge, notes.

```tsx
<RepullGuestProfile client={repull} guestId="G-123" />
```

### `<RepullPriceCell>`

A single pricing cell with the v2-xgboost recommendation. Click to open a SHAP modal with the top 5 factor breakdown. Heatmap colour reflects comp delta.

```tsx
<RepullPriceCell client={repull} listingId="L-1" date="2026-05-12" />
```

### `<RepullPDFExport>`

Branded PDF generator with three pre-baked templates (`owner-statement`, `cleaning-rota`, `welcome-pack`). Default renderer emits printable HTML — drop in `@react-pdf/renderer` via the `customRenderer` prop when you need true PDF.

```tsx
<RepullPDFExport
  template="owner-statement"
  data={{ ownerName: 'Jane', month: '2026-04', listings: [...] }}
/>
```

### `<RepullStripePayoutWidget>`

Stripe Connect onboarding + payout status. Calls `repull.payments.connectStatus()` and `repull.payments.connect()`.

```tsx
<RepullStripePayoutWidget
  client={repull}
  onConnect={(url) => window.location.assign(url)}
/>
```

## Composing primitives

The whole point is the agent reaches for these instead of writing fetch logic. A reservations dashboard becomes:

```tsx
function Dashboard() {
  const [range, setRange] = useState({ from: '2026-05-01', to: '2026-05-31' });
  const [listingIds, setListingIds] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <RepullDateRangePicker value={range} onChange={setRange} />
        <RepullPropertyPicker client={repull} multi value={listingIds} onChange={setListingIds} />
      </div>

      <RepullCalendar
        client={repull}
        mode="listings"
        listingIds={listingIds}
        from={range.from}
        to={range.to}
      />

      <RepullDataTable
        client={repull}
        resource="reservations"
        filters={{ startDate: range.from, endDate: range.to }}
      />
    </div>
  );
}
```

Zero hand-written fetch code. Zero pagination bugs. Zero `useEffect` infinite loops.

## Testing

Components ship with 40+ behavioural unit tests. Every one mocks `@repull/sdk` — no live API calls.

```bash
pnpm --filter @repull/components test
```

## Related docs

- [`/docs/embedded-agent`](https://repull.dev/docs/embedded-agent) — how the Studio agent reaches for these primitives.
- [`/docs/studio`](https://repull.dev/docs/studio) — the full Studio composition runtime.

## License

See [`LICENSE.md`](../../LICENSE.md) at the repo root.
