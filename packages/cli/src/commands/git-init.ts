/**
 * `repull studio git-init` — turn the linked Studio project into a
 * git repository on disk, optionally push it to a remote.
 *
 *   repull studio git-init [--remote <url>] [--branch <name>] [--push]
 *
 * Flow:
 *   1. Read ./repull-studio.json to get project_id + slug.
 *   2. POST /api/studio/projects/:id/git/init with {remote?, branch?}.
 *   3. Server streams back a `<slug>-git.tar.gz` whose contents form an
 *      already-initialized git repo (single initial commit on `branch`,
 *      authored as `Repull Studio <studio@repull.dev>`).
 *   4. Untar to ./<slug>-git/.
 *   5. If `--push` was passed alongside `--remote`, drive system git:
 *        git remote add origin <url>
 *        git push -u origin <branch>
 *   6. Print clear next-steps if we did NOT auto-push.
 */
import chalk from 'chalk';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import * as tar from 'tar-stream';
import { readStudioConfig } from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';
import type { GitInitPushInstruction } from '../lib/api.js';

export interface GitInitOptions {
  remote?: string;
  branch?: string;
  push?: boolean;
}

export async function runGitInit(
  options: GitInitOptions,
  rt: CommandRuntime,
): Promise<number> {
  if (options.push && !options.remote) {
    rt.io.error(
      chalk.red('error:') + ' --push requires --remote <url>.',
    );
    return 1;
  }

  let cfg;
  try {
    cfg = await readStudioConfig(rt.cwd());
  } catch (err) {
    rt.io.error(chalk.red('error:') + ' ' + (err instanceof Error ? err.message : String(err)));
    return 1;
  }

  const apiKey = await rt.resolveApiKey();
  const api = rt.apiFactory(apiKey, cfg.api_url);

  const sp1 = rt.spinner('Initializing git repo from Studio…').start();
  let response;
  try {
    response = await api.gitInit(cfg.project_id, {
      remote: options.remote,
      branch: options.branch,
    });
    sp1.succeed(
      `Received ${chalk.cyan(response.filename)} (${formatBytes(response.body.byteLength)})`,
    );
  } catch (err) {
    sp1.fail('Git init failed');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }

  // Materialize to disk under ./<slug>-git/.
  const targetDir = path.join(rt.cwd(), `${cfg.slug}-git`);
  const sp2 = rt.spinner(`Extracting to ${chalk.dim(targetDir)}…`).start();
  let fileCount = 0;
  try {
    fileCount = await extractTarGz(response.body, rt.cwd(), `${cfg.slug}-git`, rt);
    sp2.succeed(
      `Extracted ${chalk.green(String(fileCount))} entry/entries to ${chalk.dim(targetDir)}`,
    );
  } catch (err) {
    sp2.fail('Extraction failed');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }

  // Auto-push branch.
  if (options.push && options.remote) {
    const branch = response.branch;
    const sp3 = rt.spinner(`Adding remote and pushing to ${chalk.cyan(options.remote)}…`).start();
    try {
      const addRes = await rt.exec('git', ['remote', 'add', 'origin', options.remote], {
        cwd: targetDir,
      });
      if (addRes.exitCode !== 0) {
        sp3.fail('git remote add failed');
        if (addRes.stderr) rt.io.error(chalk.dim('  ' + addRes.stderr.trim()));
        return 1;
      }
      const pushRes = await rt.exec('git', ['push', '-u', 'origin', branch], {
        cwd: targetDir,
      });
      if (pushRes.exitCode !== 0) {
        sp3.fail('git push failed');
        if (pushRes.stderr) rt.io.error(chalk.dim('  ' + pushRes.stderr.trim()));
        return 1;
      }
      sp3.succeed(`Pushed ${chalk.green(branch)} to ${chalk.cyan(options.remote)}`);
      return 0;
    } catch (err) {
      sp3.fail('Push failed');
      rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
      return 1;
    }
  }

  // Print next-steps when not auto-pushing.
  rt.io.log('');
  rt.io.log(chalk.bold('Next steps:'));
  rt.io.log(chalk.dim(`  cd ${cfg.slug}-git`));
  if (response.pushInstructions && response.pushInstructions.length > 0) {
    for (const step of response.pushInstructions.slice(1)) {
      // Skip the "tar -xzf" step — we already extracted.
      rt.io.log(chalk.dim('  ' + step.command));
    }
  } else {
    rt.io.log(chalk.dim('  git remote add origin <YOUR_REMOTE_URL>'));
    rt.io.log(chalk.dim(`  git push -u origin ${response.branch}`));
  }
  rt.io.log('');
  return 0;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

/**
 * Extract a gzipped tar buffer to disk under `cwd`. The tarball's
 * top-level directory is normalized to `expectedRoot` — entries that
 * sit under a different prefix are remapped so the user always ends up
 * with `<slug>-git/`. Returns the count of file entries written.
 *
 * Path safety: any entry that escapes the destination root via `..`
 * segments is rejected (zip-slip / tar-slip). Absolute paths are
 * rejected outright.
 */
export async function extractTarGz(
  body: Uint8Array,
  cwd: string,
  expectedRoot: string,
  rt: CommandRuntime,
): Promise<number> {
  const fileWrites: Promise<void>[] = [];
  let fileCount = 0;
  const errors: Error[] = [];
  const targetRoot = path.resolve(cwd, expectedRoot);

  await new Promise<void>((resolve, reject) => {
    const extract = tar.extract();
    extract.on('entry', (header, stream, next) => {
      const name = header.name;
      // Strip the archive's top-level directory (whatever it's called)
      // and re-rooting under `expectedRoot/`. This keeps the on-disk
      // layout deterministic regardless of what the server names the
      // top entry.
      const stripped = stripTopLevel(name);
      if (!stripped) {
        // The top-level entry itself — skip the directory record but
        // ensure the directory exists.
        stream.resume();
        stream.on('end', () => next());
        stream.on('error', (e) => next(e));
        return;
      }
      const safeRel = sanitizeEntryPath(stripped);
      if (!safeRel) {
        errors.push(new Error(`unsafe tar entry refused: ${name}`));
        stream.resume();
        stream.on('end', () => next());
        return;
      }
      const dest = path.join(targetRoot, safeRel);
      const destResolved = path.resolve(dest);
      if (!destResolved.startsWith(targetRoot + path.sep) && destResolved !== targetRoot) {
        errors.push(new Error(`tar entry escapes target: ${name}`));
        stream.resume();
        stream.on('end', () => next());
        return;
      }
      if (header.type === 'directory') {
        fileWrites.push(rt.fs.mkdir(dest, { recursive: true }).then(() => undefined));
        stream.resume();
        stream.on('end', () => next());
        stream.on('error', (e) => next(e));
        return;
      }
      // File entry — collect bytes and persist.
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      stream.on('error', (e) => next(e));
      stream.on('end', () => {
        const buf = Buffer.concat(chunks);
        fileCount += 1;
        fileWrites.push(
          (async () => {
            await rt.fs.mkdir(path.dirname(dest), { recursive: true });
            await rt.fs.writeFile(dest, buf);
          })(),
        );
        next();
      });
    });
    extract.on('finish', () => resolve());
    extract.on('error', reject);
    Readable.from(Buffer.from(body)).pipe(createGunzip()).pipe(extract);
  });

  if (errors.length > 0) {
    throw errors[0]!;
  }
  await Promise.all(fileWrites);
  return fileCount;
}

/**
 * Strip the leading top-level directory from a tar entry name.
 * `foo-git/README.md` → `README.md`
 * `foo-git/`          → '' (the dir entry itself)
 * `README.md`         → `README.md` (no leading dir — keep as-is)
 */
function stripTopLevel(name: string): string {
  const idx = name.indexOf('/');
  if (idx < 0) return name;
  if (idx === name.length - 1) return ''; // top dir record
  return name.slice(idx + 1);
}

function sanitizeEntryPath(p: string): string | null {
  if (!p) return null;
  if (p.startsWith('/')) return null;
  // Forbid `..` segments anywhere — even relative escape.
  for (const seg of p.split(/[/\\]/)) {
    if (seg === '..') return null;
  }
  // Normalize `\` to `/` so Windows hosts don't trip on POSIX names.
  return p.split(/[/\\]/).join(path.sep);
}
