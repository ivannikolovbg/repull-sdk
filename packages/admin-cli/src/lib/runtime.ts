/**
 * Shared command runtime — lets the CLI swap in mock IO/api/spinner/prompt
 * implementations during tests without monkey-patching globals.
 */

import oraDefault, { type Ora } from 'ora';
import { resolveSuperadminToken, resolveApiUrl } from './auth.js';
import { createAdminApi, type AdminApi } from './api.js';

export interface CommandIO {
  log(line: string): void;
  warn(line: string): void;
  error(line: string): void;
}

export interface SpinnerLike {
  start(text?: string): SpinnerLike;
  succeed(text?: string): SpinnerLike;
  fail(text?: string): SpinnerLike;
  stop(): SpinnerLike;
  set text(value: string);
}

export type SpinnerFactory = (text?: string) => SpinnerLike;

export interface ConfirmFn {
  (message: string): Promise<boolean>;
}

export interface CommandRuntime {
  io: CommandIO;
  spinner: SpinnerFactory;
  /** Returns an admin API client. */
  apiFactory: (token: string, apiUrl: string) => AdminApi;
  resolveToken: () => Promise<string>;
  resolveApiUrl: () => Promise<string>;
  /** Y/n prompt for destructive confirmations. */
  confirm: ConfirmFn;
  now: () => Date;
}

export function defaultRuntime(): CommandRuntime {
  return {
    io: {
      log: (line) => process.stdout.write(`${line}\n`),
      warn: (line) => process.stderr.write(`${line}\n`),
      error: (line) => process.stderr.write(`${line}\n`),
    },
    spinner: (text) => wrapOra(oraDefault({ text, isEnabled: process.stdout.isTTY })),
    apiFactory: (token, apiUrl) => createAdminApi({ superadminToken: token, apiUrl }),
    resolveToken: () => resolveSuperadminToken(),
    resolveApiUrl: () => resolveApiUrl(),
    confirm: defaultConfirm,
    now: () => new Date(),
  };
}

function wrapOra(o: Ora): SpinnerLike {
  return {
    start(text) {
      if (text !== undefined) o.text = text;
      o.start();
      return this;
    },
    succeed(text) {
      o.succeed(text);
      return this;
    },
    fail(text) {
      o.fail(text);
      return this;
    },
    stop() {
      o.stop();
      return this;
    },
    set text(value: string) {
      o.text = value;
    },
  };
}

async function defaultConfirm(message: string): Promise<boolean> {
  // No tty (CI / pipe) ⇒ refuse destructive actions unless --yes was passed
  // upstream; this implementation always reads a single line from stdin.
  if (!process.stdin.isTTY) return false;
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  try {
    const ans = (await rl.question(`${message} [y/N] `)).trim().toLowerCase();
    return ans === 'y' || ans === 'yes';
  } finally {
    rl.close();
  }
}
