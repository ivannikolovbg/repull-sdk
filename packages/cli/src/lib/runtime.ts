/**
 * Shared command runtime — lets the CLI swap in mock IO/api/fs/spinner
 * implementations during tests without monkey-patching globals.
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import oraDefault, { type Ora } from 'ora';
import { resolveApiKey } from './auth.js';
import { createStudioApi, type StudioApi } from './api.js';
import { DEFAULT_API_URL } from './config.js';

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

export interface OpenerFn {
  (url: string): Promise<void> | void;
}

export interface SleepFn {
  (ms: number): Promise<void>;
}

export interface CommandRuntime {
  io: CommandIO;
  spinner: SpinnerFactory;
  /** Returns a Studio API client given the resolved api url. */
  apiFactory: (apiKey: string, apiUrl: string) => StudioApi;
  /** Resolves the bearer api key. */
  resolveApiKey: () => Promise<string>;
  /** Opens a URL in the browser. */
  open: OpenerFn;
  /** Sleeps for `ms`. Tests inject a no-op or a fake clock. */
  sleep: SleepFn;
  /** Working directory. */
  cwd: () => string;
  /** Filesystem (default to node:fs/promises). */
  fs: Pick<typeof fs, 'readFile' | 'writeFile' | 'mkdir' | 'stat'>;
}

export function defaultRuntime(): CommandRuntime {
  return {
    io: {
      log: (line) => process.stdout.write(`${line}\n`),
      warn: (line) => process.stderr.write(`${line}\n`),
      error: (line) => process.stderr.write(`${line}\n`),
    },
    spinner: (text) => wrapOra(oraDefault({ text, isEnabled: process.stdout.isTTY })),
    apiFactory: (apiKey, apiUrl) => createStudioApi({ apiKey, apiUrl: apiUrl || DEFAULT_API_URL }),
    resolveApiKey: () => resolveApiKey(),
    open: defaultOpen,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    cwd: () => process.cwd(),
    fs: {
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      mkdir: fs.mkdir,
      stat: fs.stat,
    },
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

async function defaultOpen(url: string): Promise<void> {
  const platform = os.platform();
  // Lazy import — the CLI shouldn't need to spawn anything for non-`open` flows.
  const { spawn } = await import('node:child_process');
  let cmd: string;
  let args: string[];
  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '""', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}
