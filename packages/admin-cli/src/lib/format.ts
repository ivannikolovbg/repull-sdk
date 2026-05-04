/**
 * Formatting helpers — pretty cli-table3 tables for human output and a
 * `--json` passthrough for machine consumers.
 */

import Table from 'cli-table3';
import chalk from 'chalk';

export interface OutputOptions {
  json?: boolean;
}

export function emit<T>(payload: T, opts: OutputOptions, render: (payload: T) => string[], log: (line: string) => void): void {
  if (opts.json) {
    log(JSON.stringify(payload, null, 2));
    return;
  }
  for (const line of render(payload)) log(line);
}

export interface TableSpec {
  head: string[];
  rows: ReadonlyArray<ReadonlyArray<string | number>>;
}

export function renderTable(spec: TableSpec): string {
  const t = new Table({
    head: spec.head.map((h) => chalk.bold(h)),
    style: { head: [], border: ['gray'] },
    wordWrap: true,
  });
  for (const row of spec.rows) {
    t.push([...row.map((v) => String(v ?? ''))]);
  }
  return t.toString();
}

export function colorSeverity(sev: string): string {
  const v = sev?.toLowerCase?.() ?? '';
  if (v === 'critical') return chalk.bgRed.white(` ${sev} `);
  if (v === 'high') return chalk.red(sev);
  if (v === 'medium') return chalk.yellow(sev);
  if (v === 'low') return chalk.dim(sev);
  return sev;
}
