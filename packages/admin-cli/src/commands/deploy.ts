import chalk from 'chalk';
import type { CommandRuntime } from '../lib/runtime.js';
import { AdminApiError } from '../lib/api.js';
import { emit } from '../lib/format.js';

export interface ReplayOptions {
  json?: boolean;
}

export async function runReplayDeploy(
  deploymentId: string,
  opts: ReplayOptions,
  rt: CommandRuntime,
): Promise<number> {
  const id = (deploymentId ?? '').trim();
  if (!id) {
    rt.io.error(chalk.red('error:') + ' deployment id is required');
    return 1;
  }

  const token = await rt.resolveToken();
  const apiUrl = await rt.resolveApiUrl();
  const api = rt.apiFactory(token, apiUrl);

  const sp = rt.spinner(`Replaying deployment ${chalk.cyan(id)}…`).start();
  try {
    const result = await api.replayDeployment(id);
    sp.succeed(`Deployment ${chalk.cyan(id)} replay queued`);
    emit(
      result,
      opts,
      (r) => [
        `  ${chalk.bold('deployment_id:')} ${r.deployment_id}`,
        ...(r.new_deployment_id ? [`  ${chalk.bold('new_deployment_id:')} ${r.new_deployment_id}`] : []),
        `  ${chalk.bold('status:')} ${r.status}`,
      ],
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      sp.fail('Deployment or replay endpoint not found');
      rt.io.error(chalk.dim('  Verify the deployment id and that /api/superadmin/deployments/{id}/replay is live.'));
      return 2;
    }
    sp.fail('Failed to replay deployment');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}
