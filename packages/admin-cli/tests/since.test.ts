import { describe, it, expect } from 'vitest';
import { parseSince } from '../src/lib/since.js';

describe('parseSince', () => {
  const now = new Date('2026-05-04T12:00:00.000Z');

  it('returns undefined for empty input', () => {
    expect(parseSince(undefined, now)).toBeUndefined();
    expect(parseSince('', now)).toBeUndefined();
  });

  it('parses 24h relative window', () => {
    expect(parseSince('24h', now)).toBe('2026-05-03T12:00:00.000Z');
  });

  it('parses 7d', () => {
    expect(parseSince('7d', now)).toBe('2026-04-27T12:00:00.000Z');
  });

  it('parses 30m', () => {
    expect(parseSince('30m', now)).toBe('2026-05-04T11:30:00.000Z');
  });

  it('parses 2w', () => {
    expect(parseSince('2w', now)).toBe('2026-04-20T12:00:00.000Z');
  });

  it('passes through ISO timestamps unchanged', () => {
    expect(parseSince('2026-04-29T10:00:00.000Z', now)).toBe('2026-04-29T10:00:00.000Z');
  });

  it('throws on garbage input', () => {
    expect(() => parseSince('yesterday', now)).toThrow(/Invalid --since/);
    expect(() => parseSince('5x', now)).toThrow(/Invalid --since/);
  });
});
