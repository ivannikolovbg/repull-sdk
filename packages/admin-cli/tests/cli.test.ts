import { describe, it, expect } from 'vitest';
import { buildCli, CLI_VERSION } from '../src/cli.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

describe('buildCli', () => {
  it('exposes the full top-level command tree', () => {
    const program = buildCli({ runtime: createMockRuntime(), exit: () => {} });
    const names = program.commands.map((c) => c.name()).sort();
    expect(names).toEqual(['abuse', 'audit', 'customer', 'deploy', 'host', 'project']);
  });

  it('customer has suspend + unsuspend subcommands', () => {
    const program = buildCli({ runtime: createMockRuntime(), exit: () => {} });
    const customer = program.commands.find((c) => c.name() === 'customer');
    expect(customer!.commands.map((c) => c.name()).sort()).toEqual(['suspend', 'unsuspend']);
  });

  it('prints CLI version', async () => {
    const captured: string[] = [];
    const program = buildCli({ runtime: createMockRuntime(), exit: () => {} });
    program.exitOverride();
    program.configureOutput({
      writeOut: (s) => captured.push(s),
      writeErr: (s) => captured.push(s),
    });
    try {
      await program.parseAsync(['node', 'cli', '--version']);
    } catch {
      // commander throws CommanderError on --version with exitOverride
    }
    expect(captured.join('')).toContain(CLI_VERSION);
  });

  it('routes `customer suspend` through to runSuspend', async () => {
    const { api, mocks } = createMockApi();
    mocks.suspendCustomer.mockResolvedValue({
      ok: true,
      customer_id: 10,
      suspended_at: '2026-05-04T00:00:00.000Z',
      reason: 'fraud',
    });
    const rt = createMockRuntime({ api });
    let exitCode: number | undefined;
    const program = buildCli({ runtime: rt, exit: (c) => { exitCode = c; } });
    await program.parseAsync(['node', 'cli', 'customer', 'suspend', '10', '--reason', 'fraud']);
    expect(exitCode).toBe(0);
    expect(mocks.suspendCustomer).toHaveBeenCalledWith('10', 'fraud');
  });

  it('routes `project purge --yes` past the confirm prompt', async () => {
    const { api, mocks } = createMockApi();
    mocks.purgeProject.mockResolvedValue({
      ok: true,
      project_id: 'proj_x',
      purged_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api, confirm: false });
    let exitCode: number | undefined;
    const program = buildCli({ runtime: rt, exit: (c) => { exitCode = c; } });
    await program.parseAsync(['node', 'cli', 'project', 'purge', 'proj_x', '--yes']);
    expect(exitCode).toBe(0);
    expect(rt.confirmCalls).toEqual([]);
    expect(mocks.purgeProject).toHaveBeenCalledWith('proj_x');
  });

  it('routes `abuse list --since 24h --json`', async () => {
    const { api, mocks } = createMockApi();
    mocks.listAbuseSignals.mockResolvedValue([
      { id: 's1', kind: 'k', severity: 'low', detected_at: 'now' },
    ]);
    const rt = createMockRuntime({ api });
    let exitCode: number | undefined;
    const program = buildCli({ runtime: rt, exit: (c) => { exitCode = c; } });
    await program.parseAsync(['node', 'cli', 'abuse', 'list', '--since', '24h', '--json']);
    expect(exitCode).toBe(0);
    expect(mocks.listAbuseSignals).toHaveBeenCalledTimes(1);
    const last = rt.io.out[rt.io.out.length - 1] ?? '';
    expect(JSON.parse(last)).toHaveLength(1);
  });

  it('routes `audit query --customer 10 --since 7d --limit 25`', async () => {
    const { api, mocks } = createMockApi();
    mocks.queryAuditLog.mockResolvedValue([]);
    const rt = createMockRuntime({ api });
    let exitCode: number | undefined;
    const program = buildCli({ runtime: rt, exit: (c) => { exitCode = c; } });
    await program.parseAsync([
      'node', 'cli', 'audit', 'query',
      '--customer', '10', '--since', '7d', '--limit', '25',
    ]);
    expect(exitCode).toBe(0);
    expect(mocks.queryAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      customerId: '10',
      limit: 25,
    }));
  });

  it('routes `deploy replay <id>`', async () => {
    const { api, mocks } = createMockApi();
    mocks.replayDeployment.mockResolvedValue({
      ok: true,
      deployment_id: 'dep_x',
      status: 'queued',
    });
    const rt = createMockRuntime({ api });
    let exitCode: number | undefined;
    const program = buildCli({ runtime: rt, exit: (c) => { exitCode = c; } });
    await program.parseAsync(['node', 'cli', 'deploy', 'replay', 'dep_x']);
    expect(exitCode).toBe(0);
    expect(mocks.replayDeployment).toHaveBeenCalledWith('dep_x');
  });

  it('routes `host drain --yes`', async () => {
    const { api, mocks } = createMockApi();
    mocks.drainHost.mockResolvedValue({
      ok: true,
      host_id: 'host_a',
      drained_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api });
    let exitCode: number | undefined;
    const program = buildCli({ runtime: rt, exit: (c) => { exitCode = c; } });
    await program.parseAsync(['node', 'cli', 'host', 'drain', 'host_a', '--yes']);
    expect(exitCode).toBe(0);
    expect(mocks.drainHost).toHaveBeenCalledWith('host_a');
  });
});
