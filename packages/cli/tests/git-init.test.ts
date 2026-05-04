import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';
import * as tar from 'tar-stream';
import { runGitInit } from '../src/commands/git-init.js';
import { writeStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

async function setupProjectDir(slug = 'demo'): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-git-init-'));
  await writeStudioConfig({ project_id: 'proj_42', slug, api_url: 'https://api.example.com' }, dir);
  return dir;
}

async function makeFakeTarGz(
  topLevel: string,
  files: Record<string, string | Buffer>,
): Promise<Uint8Array> {
  const pack = tar.pack();
  const gz = createGzip();
  pack.pipe(gz);

  // Top-level directory record.
  await new Promise<void>((resolve, reject) => {
    pack.entry({ name: `${topLevel}/`, type: 'directory' }, (err) =>
      err ? reject(err) : resolve(),
    );
  });
  for (const [rel, body] of Object.entries(files)) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    await new Promise<void>((resolve, reject) => {
      pack.entry({ name: `${topLevel}/${rel}`, size: buf.byteLength }, buf, (err) =>
        err ? reject(err) : resolve(),
      );
    });
  }
  pack.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of gz as unknown as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function makeMaliciousTarGz(): Promise<Uint8Array> {
  const pack = tar.pack();
  const gz = createGzip();
  pack.pipe(gz);
  // Path traversal entry — must be rejected by the extractor.
  const evil = Buffer.from('PWNED', 'utf8');
  await new Promise<void>((resolve, reject) => {
    pack.entry({ name: 'demo-git/../escape.txt', size: evil.byteLength }, evil, (err) =>
      err ? reject(err) : resolve(),
    );
  });
  pack.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of gz as unknown as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

describe('runGitInit', () => {
  it('downloads the tarball, extracts it under <slug>-git/, and prints next-steps', async () => {
    const dir = await setupProjectDir('demo');
    const body = await makeFakeTarGz('demo-git', {
      'README.md': '# demo\n',
      '.gitignore': 'node_modules/\n',
      'src/app.ts': 'export const a = 1\n',
      // Synthetic .git artifact — we don't validate git internals here,
      // we just make sure the extractor preserves them.
      '.git/HEAD': 'ref: refs/heads/main\n',
    });
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockResolvedValue({
      body,
      filename: 'demo-git.tar.gz',
      branch: 'main',
      slug: 'demo',
      pushInstructions: undefined,
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit({}, rt);
    expect(code).toBe(0);
    expect(mocks.gitInit).toHaveBeenCalledWith('proj_42', { remote: undefined, branch: undefined });

    const target = path.join(dir, 'demo-git');
    const readme = await fs.readFile(path.join(target, 'README.md'), 'utf8');
    expect(readme).toContain('# demo');
    const app = await fs.readFile(path.join(target, 'src/app.ts'), 'utf8');
    expect(app).toContain('export const a = 1');
    const head = await fs.readFile(path.join(target, '.git/HEAD'), 'utf8');
    expect(head).toContain('refs/heads/main');

    const out = rt.io.out.join('\n');
    expect(out).toMatch(/Next steps/);
    expect(out).toContain('cd demo-git');
    expect(out).toContain('git remote add origin');
    expect(out).toContain('git push -u origin main');

    // No exec calls — we did NOT auto-push.
    expect(rt.execCalls).toEqual([]);
  });

  it('passes --remote + --branch through to the API', async () => {
    const dir = await setupProjectDir('demo');
    const body = await makeFakeTarGz('demo-git', { 'README.md': '# demo\n' });
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockResolvedValue({
      body,
      filename: 'demo-git.tar.gz',
      branch: 'trunk',
      slug: 'demo',
      pushInstructions: [
        { label: 'Extract', command: 'tar -xzf demo-git.tar.gz' },
        { label: 'Add remote', command: 'git remote add origin https://example.com/me/x.git' },
        { label: 'Push', command: 'git push -u origin trunk' },
      ],
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit(
      { remote: 'https://example.com/me/x.git', branch: 'trunk' },
      rt,
    );
    expect(code).toBe(0);
    expect(mocks.gitInit).toHaveBeenCalledWith('proj_42', {
      remote: 'https://example.com/me/x.git',
      branch: 'trunk',
    });
    const out = rt.io.out.join('\n');
    expect(out).toContain('git remote add origin https://example.com/me/x.git');
    expect(out).toContain('git push -u origin trunk');
    // Doesn't print "tar -xzf" — we already did.
    expect(out).not.toContain('tar -xzf');
  });

  it('runs git remote add + git push when --push --remote are given', async () => {
    const dir = await setupProjectDir('demo');
    const body = await makeFakeTarGz('demo-git', { 'README.md': '# demo\n' });
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockResolvedValue({
      body,
      filename: 'demo-git.tar.gz',
      branch: 'main',
      slug: 'demo',
      pushInstructions: [],
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit(
      { remote: 'git@github.com:me/demo.git', push: true },
      rt,
    );
    expect(code).toBe(0);
    const target = path.join(dir, 'demo-git');
    expect(rt.execCalls).toEqual([
      {
        command: 'git',
        args: ['remote', 'add', 'origin', 'git@github.com:me/demo.git'],
        cwd: target,
      },
      {
        command: 'git',
        args: ['push', '-u', 'origin', 'main'],
        cwd: target,
      },
    ]);
  });

  it('returns 1 when --push is given without --remote', async () => {
    const dir = await setupProjectDir('demo');
    const { api } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit({ push: true }, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/--push requires --remote/);
  });

  it('returns 1 and prints the API error when the server fails', async () => {
    const dir = await setupProjectDir('demo');
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockRejectedValue(new Error('rate limited'));
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit({}, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/rate limited/);
  });

  it('returns 1 and surfaces stderr when git remote add fails', async () => {
    const dir = await setupProjectDir('demo');
    const body = await makeFakeTarGz('demo-git', { 'README.md': '# demo\n' });
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockResolvedValue({
      body,
      filename: 'demo-git.tar.gz',
      branch: 'main',
      slug: 'demo',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    rt.execResults.set('git remote', {
      exitCode: 128,
      stdout: '',
      stderr: 'fatal: remote origin already exists.\n',
    });
    const code = await runGitInit(
      { remote: 'https://example.com/x.git', push: true },
      rt,
    );
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/remote origin already exists/);
    // Should NOT have invoked `git push` after the failure.
    expect(rt.execCalls.find((c) => c.args[0] === 'push')).toBeUndefined();
  });

  it('returns 1 and surfaces stderr when git push fails', async () => {
    const dir = await setupProjectDir('demo');
    const body = await makeFakeTarGz('demo-git', { 'README.md': '# demo\n' });
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockResolvedValue({
      body,
      filename: 'demo-git.tar.gz',
      branch: 'main',
      slug: 'demo',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    rt.execResults.set('git push', {
      exitCode: 128,
      stdout: '',
      stderr: 'fatal: Authentication failed\n',
    });
    const code = await runGitInit(
      { remote: 'https://example.com/x.git', push: true },
      rt,
    );
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/Authentication failed/);
  });

  it('rejects path-traversal entries in the tarball', async () => {
    const dir = await setupProjectDir('demo');
    const body = await makeMaliciousTarGz();
    const { api, mocks } = createMockApi();
    mocks.gitInit.mockResolvedValue({
      body,
      filename: 'demo-git.tar.gz',
      branch: 'main',
      slug: 'demo',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit({}, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/(unsafe|escape)/i);
    // The malicious file must NOT have landed on disk.
    await expect(fs.access(path.join(dir, 'escape.txt'))).rejects.toThrow();
  });

  it('returns 1 with a friendly message when no repull-studio.json is present', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-git-init-no-cfg-'));
    const { api } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runGitInit({}, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/repull-studio\.json/);
  });
});
