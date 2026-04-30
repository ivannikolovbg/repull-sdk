/**
 * Local SDK smoke test. Run with:
 *   REPULL_API_KEY=... node scripts/smoke.mjs
 *
 * Hits the live api.repull.dev to verify the facade works end-to-end.
 */
import { Repull } from '../packages/sdk/dist/index.js';

const key = process.env.REPULL_API_KEY;
if (!key) {
  console.error('REPULL_API_KEY required');
  process.exit(1);
}

const repull = new Repull({ apiKey: key });

console.log('-- health --');
console.log(await repull.health.check());

console.log('-- /v1/connect --');
console.log(await repull.connect.list());

console.log('-- /v1/connect/airbnb status --');
console.log(await repull.connect.airbnb.status());

console.log('-- /v1/properties --');
console.log(await repull.properties.list({ limit: 2 }));

console.log('-- /v1/reservations --');
console.log(await repull.reservations.list({ limit: 2 }));

console.log('OK');
