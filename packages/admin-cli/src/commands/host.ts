import chalk from 'chalk';
import type { CommandRuntime } from '../lib/runtime.js';
import { AdminApiError } from '../lib/api.js';
import { emit } from '../lib/format.js';

export interface DrainOptions {
  yes?: boolean;
  json?: boolean;
}

export async function runDrainHost(
  hostId: string,
  opts: DrainOptions,
  rt: CommandRuntime,
): Promise<number> {
  const id = (hostId ?? '').trim();
  if (!id) {
    rt.io.error(chalk.red('error:') + ' host id is required');
    return 1;
  }

  if (!opts.yes) {
    const ok = await rt.confirm(
      `${chalk.red('Drain')} host ${chalk.cyan(id)}? This marks it unhealthy in studio_hosts and evacuates all containers.`,
    );
    if (!ok) {
      rt.io.warn(chalk.dim('Aborted.'));
      return 1;
    }
  }

  const token = await rt.resolveToken();
  const apiUrl = await rt.resolveApiUrl();
  const api = rt.apiFactory(token, apiUrl);

  const sp = rt.spinner(`Draining host ${chalk.cyan(id)}…`).start();
  try {
    const result = await api.drainHost(id);
    sp.succeed(`Host ${chalk.cyan(id)} draining`);
    emit(
      result,
      opts,
      (r) => [
        `  ${chalk.bold('host_id:')} ${r.host_id}`,
        `  ${chalk.bold('drained_at:')} ${r.drained_at}`,
        ...(typeof r.containers_evacuated === 'number'
          ? [`  ${chalk.bold('containers_evacuated:')} ${r.containers_evacuated}`]
          : []),
      ],
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      sp.fail('Host or drain endpoint not found');
      rt.io.error(chalk.dim('  Verify the host id and that /api/superadmin/hosts/{id}/drain is live.'));
      return 2;
    }
    sp.fail('Failed to drain host');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}
