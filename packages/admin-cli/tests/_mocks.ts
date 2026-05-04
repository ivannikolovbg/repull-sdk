import { vi, type Mock } from 'vitest';
import type { AdminApi } from '../src/lib/api.js';
import type { CommandIO, CommandRuntime, SpinnerLike } from '../src/lib/runtime.js';

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
  api: AdminApi;
  mocks: { [K in keyof AdminApi]: Mock };
}

export function createMockApi(overrides: Partial<{ [K in keyof AdminApi]: Mock }> = {}): MockApi {
  const mocks = {
    suspendCustomer: overrides.suspendCustomer ?? vi.fn(),
    unsuspendCustomer: overrides.unsuspendCustomer ?? vi.fn(),
    purgeProject: overrides.purgeProject ?? vi.fn(),
    listAbuseSignals: overrides.listAbuseSignals ?? vi.fn(),
    queryAuditLog: overrides.queryAuditLog ?? vi.fn(),
    replayDeployment: overrides.replayDeployment ?? vi.fn(),
    drainHost: overrides.drainHost ?? vi.fn(),
  };
  const api: AdminApi = {
    suspendCustomer: (...a) => mocks.suspendCustomer(...a),
    unsuspendCustomer: (...a) => mocks.unsuspendCustomer(...a),
    purgeProject: (...a) => mocks.purgeProject(...a),
    listAbuseSignals: (...a) => mocks.listAbuseSignals(...a),
    queryAuditLog: (...a) => mocks.queryAuditLog(...a),
    replayDeployment: (...a) => mocks.replayDeployment(...a),
    drainHost: (...a) => mocks.drainHost(...a),
  };
  return { api, mocks };
}

export interface MockRuntimeOptions {
  token?: string;
  apiUrl?: string;
  api?: AdminApi;
  /** Defaults to true so destructive commands don't block in tests. */
  confirm?: boolean | ((message: string) => Promise<boolean>);
  now?: Date;
}

export interface MockRuntime extends CommandRuntime {
  io: MockIO;
  confirmCalls: string[];
}

export function createMockRuntime(opts: MockRuntimeOptions = {}): MockRuntime {
  const io = createMockIO();
  const confirmCalls: string[] = [];
  const apiInstance = opts.api ?? createMockApi().api;
  const token = opts.token ?? 'sk_admin_mock';
  const apiUrl = opts.apiUrl ?? 'https://api.repull.dev';
  const confirmDecision: boolean | ((message: string) => Promise<boolean>) =
    opts.confirm === undefined ? true : opts.confirm;

  const rt: MockRuntime = {
    io,
    confirmCalls,
    spinner: () => createMockSpinner(),
    apiFactory: () => apiInstance,
    resolveToken: async () => token,
    resolveApiUrl: async () => apiUrl,
    confirm: async (message: string) => {
      confirmCalls.push(message);
      if (typeof confirmDecision === 'function') return confirmDecision(message);
      return confirmDecision;
    },
    now: () => opts.now ?? new Date('2026-05-04T00:00:00.000Z'),
  };
  return rt;
}
