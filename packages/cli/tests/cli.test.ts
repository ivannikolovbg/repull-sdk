import { describe, it, expect, vi } from 'vitest';
import { buildCli, CLI_VERSION } from '../src/cli.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { writeStudioConfig } from '../src/lib/config.js';

describe('buildCli', () => {
  it('exposes a `studio` command tree with init/pull/push/deploy/logs/open/git-init', () => {
    const program = buildCli({ runtime: createMockRuntime(), exit: () => {} });
    const studio = program.commands.find((c) => c.name() === 'studio');
    expect(studio).toBeDefined();
    const names = studio!.commands.map((c) => c.name()).sort();
    expect(names).toEqual(['deploy', 'git-init', 'init', 'logs', 'open', 'pull', 'push']);
  });

  it('prints the version string with --version', async () => {
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

  it('runs `studio init` end-to-end against the mock runtime', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-cli-init-'));
    const { api, mocks } = createMockApi();
    mocks.createProject.mockResolvedValue({
      id: 'proj_cli',
      slug: 'demo',
      name: 'demo',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    let exitCode: number | undefined;
    const program = buildCli({
      runtime: rt,
      exit: (code) => {
        exitCode = code;
      },
    });
    await program.parseAsync(['node', 'cli', 'studio', 'init', 'demo']);
    expect(exitCode).toBe(0);
    expect(mocks.createProject).toHaveBeenCalledWith({ name: 'demo' });
    const cfg = JSON.parse(await fs.readFile(path.join(dir, 'repull-studio.json'), 'utf8'));
    expect(cfg.project_id).toBe('proj_cli');
  });

  it('routes `studio open` through the runtime opener', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-cli-open-'));
    await writeStudioConfig({ project_id: 'proj_open', slug: 's' }, dir);
    const { api } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    let exitCode: number | undefined;
    const program = buildCli({
      runtime: rt,
      exit: (code) => {
        exitCode = code;
      },
    });
    await program.parseAsync(['node', 'cli', 'studio', 'open']);
    expect(exitCode).toBe(0);
    expect(rt.openCalls).toEqual(['https://repull.dev/studio/proj_open']);
  });

  it('passes --tail through to runLogs', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-cli-logs-'));
    await writeStudioConfig({ project_id: 'proj_logs', slug: 's' }, dir);
    const { api, mocks } = createMockApi();
    mocks.getLatestDeployment.mockResolvedValue({
      id: 'dep_logs',
      project_id: 'proj_logs',
      status: 'live',
    });
    mocks.getLogs.mockResolvedValue({ deployment_id: 'dep_logs', logs: [] });
    const rt = createMockRuntime({ cwd: dir, api });
    let exitCode: number | undefined;
    const program = buildCli({
      runtime: rt,
      exit: (code) => {
        exitCode = code;
      },
    });
    await program.parseAsync(['node', 'cli', 'studio', 'logs', '--tail', '25']);
    expect(exitCode).toBe(0);
    expect(mocks.getLogs).toHaveBeenCalledWith('dep_logs', 25);
  });
});
