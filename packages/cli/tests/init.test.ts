import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { runInit } from '../src/commands/init.js';
import { readStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

describe('runInit', () => {
  it('creates the project, writes ./repull-studio.json, and returns 0', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-init-ok-'));
    const { api, mocks } = createMockApi();
    mocks.createProject.mockResolvedValue({
      id: 'proj_42',
      slug: 'awesome-site',
      name: 'awesome-site',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runInit('awesome-site', { apiUrl: 'https://api.example.com' }, rt);
    expect(code).toBe(0);
    expect(mocks.createProject).toHaveBeenCalledWith({ name: 'awesome-site' });
    const cfg = await readStudioConfig(dir);
    expect(cfg.project_id).toBe('proj_42');
    expect(cfg.slug).toBe('awesome-site');
    expect(cfg.api_url).toBe('https://api.example.com');
  });

  it('returns 1 and does not write a config when the API errors', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-init-err-'));
    const { api, mocks } = createMockApi();
    mocks.createProject.mockRejectedValue(new Error('quota exceeded'));
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runInit('foo', {}, rt);
    expect(code).toBe(1);
    await expect(readStudioConfig(dir)).rejects.toThrow();
    expect(rt.io.err.join('\n')).toMatch(/quota exceeded/);
  });

  it('rejects empty names with exit code 1', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-init-empty-'));
    const { api, mocks } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runInit('   ', {}, rt);
    expect(code).toBe(1);
    expect(mocks.createProject).not.toHaveBeenCalled();
  });
});
