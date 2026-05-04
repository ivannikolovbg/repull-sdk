/**
 * Parses relative-time shorthand like `24h`, `7d`, `30m`, `2w` into an
 * absolute ISO-8601 timestamp anchored to `now`. Also accepts already-ISO
 * inputs and passes them through unchanged.
 *
 * Used by `repull-admin abuse list --since 24h` and
 * `repull-admin audit query --since 7d` to send a backend-friendly bound.
 */

const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

export function parseSince(input: string | undefined, now: Date = new Date()): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // ISO-8601 passthrough
  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return asDate.toISOString();
  }

  const match = /^(\d+)\s*([smhdw])$/i.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid --since value "${input}". Use a relative shorthand like "24h", "7d", "30m", "2w" or an ISO-8601 timestamp.`,
    );
  }
  const amount = Number.parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const ms = amount * (UNITS[unit] ?? 0);
  if (!ms) {
    throw new Error(`Invalid --since unit "${unit}".`);
  }
  return new Date(now.getTime() - ms).toISOString();
}
