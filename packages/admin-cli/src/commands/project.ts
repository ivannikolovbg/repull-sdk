import chalk from 'chalk';
import type { CommandRuntime } from '../lib/runtime.js';
import { AdminApiError } from '../lib/api.js';
import { emit } from '../lib/format.js';

export interface PurgeOptions {
  yes?: boolean;
  json?: boolean;
}

export async function runPurgeProject(
  projectId: string,
  opts: PurgeOptions,
  rt: CommandRuntime,
): Promise<number> {
  const id = (projectId ?? '').trim();
  if (!id) {
    rt.io.error(chalk.red('error:') + ' project id is required');
    return 1;
  }

  if (!opts.yes) {
    const ok = await rt.confirm(
      `${chalk.red('Force-purge')} project ${chalk.cyan(id)}? This SKIPS the 30-day soft-delete window and is irreversible.`,
    );
    if (!ok) {
      rt.io.warn(chalk.dim('Aborted.'));
      return 1;
    }
  }

  const token = await rt.resolveToken();
  const apiUrl = await rt.resolveApiUrl();
  const api = rt.apiFactory(token, apiUrl);

  const sp = rt.spinner(`Force-purging project ${chalk.cyan(id)}…`).start();
  try {
    const result = await api.purgeProject(id);
    sp.succeed(`Project ${chalk.cyan(id)} purged`);
    emit(
      result,
      opts,
      (r) => [
        `  ${chalk.bold('project_id:')} ${r.project_id}`,
        `  ${chalk.bold('purged_at:')} ${r.purged_at}`,
        ...(typeof r.rows_deleted === 'number' ? [`  ${chalk.bold('rows_deleted:')} ${r.rows_deleted}`] : []),
      ],
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      sp.fail('Project not found or purge endpoint not deployed');
      rt.io.error(chalk.dim('  Verify the project id and that /api/superadmin/projects/{id}/purge is live.'));
      return 2;
    }
    sp.fail('Failed to purge project');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}
