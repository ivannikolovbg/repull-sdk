# @repull/eslint-plugin-repull-only

ESLint plugin that bans third-party PMS / OTA / pricing / raw-payment /
raw-AI / raw-HTTP imports in Repull Studio templates. Pair with
`@repull/sdk`, `@repull/components`, and `@repull/ai-sdk` for the full
SDK-only developer experience.

This is **layer 3** of the Repull SDK-only moat:

| Layer | Where | What it does |
|-------|-------|--------------|
| 1. Prompt | Studio Kimi proxy (`dominator/src/lib/kimi-proxy`) | Tells Kimi K2 to compose only from `@repull/*` |
| 2. Eval | Studio eval harness (`repull-studio/tests/kimi-eval`) | Catches generations that smuggle banned imports |
| 3. Lint (this) | Template `package.json` devDependencies | Editor-time tripwire that fails the next save |

## Install

```bash
pnpm add -D @repull/eslint-plugin-repull-only eslint
```

## Usage

### Flat config (ESLint 9+)

```js
// eslint.config.js
import repullOnly from "@repull/eslint-plugin-repull-only";

export default [
  repullOnly.configs.recommended,
];
```

### Legacy `.eslintrc`

```jsonc
{
  "extends": ["plugin:@repull/repull-only/recommended"]
}
```

### Studio template `package.json`

Every Studio template should pin this plugin in `devDependencies`:

```json
{
  "devDependencies": {
    "@repull/eslint-plugin-repull-only": "^0.1.0",
    "eslint": "^9.0.0"
  }
}
```

## Rules

### `no-non-repull-imports`

Reports an error for any banned third-party import. Each ban surfaces
a named remediation hint:

```ts
import Stripe from "stripe";
//                 ^^^^^^^^
// 'stripe' is banned in Repull Studio templates (stripe).
// use @repull/sdk Stripe Connect wrappers.

import { HostawayClient } from "@hostaway/sdk";
//                              ^^^^^^^^^^^^^^^
// '@hostaway/sdk' is banned in Repull Studio templates (Hostaway).
// use @repull/sdk.
```

The complete denylist (kept in sync with the repull-studio eval check):

- **Channel managers / PMS:** Hostaway, Guesty, Lodgify, Smoobu, Beds24, BookingSync, OwnerRez, iGMS, Hospitable
- **Pricing tools:** PriceLabs, Wheelhouse, BeyondPricing
- **Raw payments / AI / HTTP:** `stripe`, `openai`, `@anthropic-ai/sdk`, `axios`, `request`, `node-fetch`

The rule scans `import` declarations, dynamic `import()` calls, and
`require()` calls.

## License

See [LICENSE.md](../../LICENSE.md) at the monorepo root.
