import { vi, type Mock } from 'vitest';
import { promises as fs } from 'node:fs';
import type { StudioApi } from '../src/lib/api.js';
import type {
  CommandIO,
  CommandRuntime,
  ExecResult,
  SpinnerLike,
} from '../src/lib/runtime.js';

export interface MockIO extends CommandIO {
  out: string[];
  err: string[];
}

export function createMockIO(): MockIO {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    log: (line) => out.push(line),
    warn: (line) => err.push(line),
    error: (line) => err.push(line),
  };
}

export function createMockSpinner(): SpinnerLike {
  const sp: SpinnerLike = {
    start() {
      return sp;
    },
    succeed() {
      return sp;
    },
    fail() {
      return sp;
    },
    stop() {
      return sp;
    },
    set text(_value: string) {
      // noop
    },
  };
  return sp;
}

export interface MockApi {
  api: StudioApi;
  mocks: { [K in keyof StudioApi]: Mock };
}

export function createMockApi(overrides: Partial<{ [K in keyof StudioApi]: Mock }> = {}): MockApi {
  const mocks = {
    createProject: overrides.createProject ?? vi.fn(),
    listFiles: overrides.listFiles ?? vi.fn(),
    getFile: overrides.getFile ?? vi.fn(),
    putFile: overrides.putFile ?? vi.fn(),
    createDeployment: overrides.createDeployment ?? vi.fn(),
    getDeployment: overrides.getDeployment ?? vi.fn(),
    getLatestDeployment: overrides.getLatestDeployment ?? vi.fn(),
    getLogs: overrides.getLogs ?? vi.fn(),
    gitInit: overrides.gitInit ?? vi.fn(),
  };
  const api: StudioApi = {
    createProject: (...a) => mocks.createProject(...a),
    listFiles: (...a) => mocks.listFiles(...a),
    getFile: (...a) => mocks.getFile(...a),
    putFile: (...a) => mocks.putFile(...a),
    createDeployment: (...a) => mocks.createDeployment(...a),
    getDeployment: (...a) => mocks.getDeployment(...a),
    getLatestDeployment: (...a) => mocks.getLatestDeployment(...a),
    getLogs: (...a) => mocks.getLogs(...a),
    gitInit: (...a) => mocks.gitInit(...a),
  };
  return { api, mocks };
}

export interface MockRuntimeOptions {
  cwd?: string;
  apiKey?: string;
  api?: StudioApi;
}

export interface ExecCall {
  command: string;
  args: string[];
  cwd?: string;
}

export interface MockRuntime extends CommandRuntime {
  io: MockIO;
  openCalls: string[];
  sleepCalls: number[];
  execCalls: ExecCall[];
  /**
   * Per-command result map keyed by `command + ' ' + first-arg`. Tests
   * may set entries before invoking commands. Default is exit 0.
   */
  execResults: Map<string, ExecResult>;
}

export function createMockRuntime(opts: MockRuntimeOptions = {}): MockRuntime {
  const io = createMockIO();
  const openCalls: string[] = [];
  const sleepCalls: number[] = [];
  const cwd = opts.cwd ?? '/tmp/mock-cwd';
  const apiKey = opts.apiKey ?? 'sk_test_mock';
  const apiInstance = opts.api ?? createMockApi().api;

  const execCalls: ExecCall[] = [];
  const execResults = new Map<string, ExecResult>();

  const rt: MockRuntime = {
    io,
    openCalls,
    sleepCalls,
    execCalls,
    execResults,
    spinner: () => createMockSpinner(),
    apiFactory: () => apiInstance,
    resolveApiKey: async () => apiKey,
    open: (url) => {
      openCalls.push(url);
    },
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
    cwd: () => cwd,
    // Use real fs — tests create real temp directories.
    fs: {
      readFile: fs.readFile,
      writeFile: fs.writeFile,
      mkdir: fs.mkdir,
      stat: fs.stat,
    },
    exec: async (command, args, options) => {
      execCalls.push({ command, args, cwd: options?.cwd });
      const key = `${command} ${args[0] ?? ''}`;
      return (
        execResults.get(key) ?? { exitCode: 0, stdout: '', stderr: '' }
      );
    },
  };
  return rt;
}
