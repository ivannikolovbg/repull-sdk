import { describe, it, expect } from 'vitest';
import { renderTable, colorSeverity, emit } from '../src/lib/format.js';

describe('renderTable', () => {
  it('renders heads and rows', () => {
    const out = renderTable({
      head: ['A', 'B'],
      rows: [['1', '2'], ['3', '4']],
    });
    expect(out).toContain('A');
    expect(out).toContain('1');
    expect(out).toContain('4');
  });
});

describe('colorSeverity', () => {
  it('passes the value through (with optional ansi)', () => {
    expect(colorSeverity('high')).toContain('high');
    expect(colorSeverity('low')).toContain('low');
    expect(colorSeverity('unknown')).toContain('unknown');
  });
});

describe('emit', () => {
  it('emits text via render() by default', () => {
    const out: string[] = [];
    emit({ a: 1 }, {}, () => ['line-a', 'line-b'], (l) => out.push(l));
    expect(out).toEqual(['line-a', 'line-b']);
  });

  it('emits JSON when opts.json', () => {
    const out: string[] = [];
    emit({ a: 1 }, { json: true }, () => ['ignored'], (l) => out.push(l));
    expect(out).toEqual([JSON.stringify({ a: 1 }, null, 2)]);
  });
});
