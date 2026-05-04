import chalk from 'chalk';
import { readStudioConfig } from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';
import type { StudioDeployment, StudioDeploymentStatus } from '../lib/api.js';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const TERMINAL: ReadonlySet<StudioDeploymentStatus> = new Set([
  'live',
  'failed',
  'cancelled',
]);

export interface DeployOptions {
  /** Override the polling interval (test hook). */
  pollIntervalMs?: number;
  /** Override the total polling deadline (test hook). */
  pollTimeoutMs?: number;
}

export async function runDeploy(
  opts: DeployOptions,
  rt: CommandRuntime,
): Promise<number> {
  const cfg = await readStudioConfig(rt.cwd());
  const apiKey = await rt.resolveApiKey();
  const api = rt.apiFactory(apiKey, cfg.api_url);

  const sp = rt.spinner(`Triggering deploy for ${chalk.cyan(cfg.slug)}…`).start();
  let deployment: StudioDeployment;
  try {
    deployment = await api.createDeployment(cfg.project_id);
    sp.succeed(`Deploy queued ${chalk.dim(deployment.id)}`);
  } catch (err) {
    sp.fail('Failed to trigger deploy');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }

  const interval = opts.pollIntervalMs ?? POLL_INTERVAL_MS;
  const deadline = Date.now() + (opts.pollTimeoutMs ?? POLL_TIMEOUT_MS);
  const sp2 = rt.spinner(`Status: ${deployment.status}`).start();
  let last: StudioDeployment = deployment;
  while (!TERMINAL.has(last.status)) {
    if (Date.now() > deadline) {
      sp2.fail(`Timed out after ${Math.round((opts.pollTimeoutMs ?? POLL_TIMEOUT_MS) / 1000)}s — deployment still ${last.status}`);
      rt.io.error(chalk.dim(`  Check progress: repull studio logs --tail 100`));
      return 1;
    }
    await rt.sleep(interval);
    try {
      last = await api.getDeployment(deployment.id);
      sp2.text = `Status: ${last.status}`;
    } catch (err) {
      sp2.fail('Lost connection while polling');
      rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
      return 1;
    }
  }

  if (last.status === 'live') {
    sp2.succeed(`Deployment is ${chalk.green('live')}`);
    if (last.url) rt.io.log(`  ${chalk.bold('URL:')} ${chalk.cyan(last.url)}`);
    return 0;
  }
  sp2.fail(`Deployment ${last.status}${last.error ? ` — ${last.error}` : ''}`);
  rt.io.error(chalk.dim(`  Tail logs: repull studio logs --tail 200`));
  return 1;
}
