# @repull/sdk

The official TypeScript SDK for [Repull](https://repull.dev) — one API for vacation-rental tech: Airbnb, Booking.com, Vrbo and more channels, plus 15 PMS platforms, behind one key, with white-label Connect for linking your users' accounts.

```bash
npm install @repull/sdk
```

```ts
import { Repull } from '@repull/sdk';

const repull = new Repull({ apiKey: process.env.REPULL_API_KEY! });

const { data, pagination } = await repull.reservations.list({ limit: 50 });
```

Get an API key at [repull.dev/dashboard](https://repull.dev/dashboard). Full API reference and guides: [repull.dev/docs](https://repull.dev/docs). Source and more examples: [github.com/ivannikolovbg/repull-sdk](https://github.com/ivannikolovbg/repull-sdk).

## License

Repull SDK Community License — see [LICENSE.md](https://github.com/ivannikolovbg/repull-sdk/blob/main/LICENSE.md).
