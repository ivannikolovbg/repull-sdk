import chalk from 'chalk';
import * as path from 'node:path';
import { readStudioConfig } from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';

export async function runPull(rt: CommandRuntime): Promise<number> {
  const cfg = await readStudioConfig(rt.cwd());
  const apiKey = await rt.resolveApiKey();
  const api = rt.apiFactory(apiKey, cfg.api_url);
  const sp = rt.spinner('Listing project files…').start();
  let files;
  try {
    files = await api.listFiles(cfg.project_id);
    sp.succeed(`Found ${chalk.cyan(String(files.length))} file(s)`);
  } catch (err) {
    sp.fail('Failed to list files');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
  if (files.length === 0) {
    rt.io.log(chalk.dim('  (project has no files yet — nothing to download)'));
    return 0;
  }
  const sp2 = rt.spinner(`Downloading ${files.length} file(s)…`).start();
  let written = 0;
  try {
    for (const f of files) {
      const content = await api.getFile(cfg.project_id, f.path);
      const target = path.join(rt.cwd(), f.path);
      await rt.fs.mkdir(path.dirname(target), { recursive: true });
      const buf =
        content.encoding === 'base64'
          ? Buffer.from(content.content, 'base64')
          : content.content;
      await rt.fs.writeFile(target, buf);
      written += 1;
    }
    sp2.succeed(`Pulled ${chalk.green(String(written))} file(s) into ${chalk.dim(rt.cwd())}`);
    return 0;
  } catch (err) {
    sp2.fail('Pull failed');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}
