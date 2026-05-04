import chalk from 'chalk';
import type { CommandRuntime } from '../lib/runtime.js';
import { AdminApiError } from '../lib/api.js';
import { emit } from '../lib/format.js';

export interface SuspendOptions {
  reason?: string;
  json?: boolean;
}

export async function runSuspend(
  customerId: string,
  opts: SuspendOptions,
  rt: CommandRuntime,
): Promise<number> {
  const id = (customerId ?? '').trim();
  if (!id) {
    rt.io.error(chalk.red('error:') + ' customer id is required (e.g. `repull-admin customer suspend 10`)');
    return 1;
  }
  const token = await rt.resolveToken();
  const apiUrl = await rt.resolveApiUrl();
  const api = rt.apiFactory(token, apiUrl);

  const sp = rt.spinner(`Suspending customer ${chalk.cyan(id)}…`).start();
  try {
    const result = await api.suspendCustomer(id, opts.reason);
    sp.succeed(`Customer ${chalk.cyan(id)} suspended`);
    emit(
      result,
      opts,
      (r) => [
        `  ${chalk.bold('customer_id:')} ${r.customer_id}`,
        `  ${chalk.bold('suspended_at:')} ${r.suspended_at}`,
        ...(r.reason ? [`  ${chalk.bold('reason:')} ${r.reason}`] : []),
      ],
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    return handleError(sp, rt, 'suspend', err);
  }
}

export interface UnsuspendOptions {
  json?: boolean;
}

export async function runUnsuspend(
  customerId: string,
  opts: UnsuspendOptions,
  rt: CommandRuntime,
): Promise<number> {
  const id = (customerId ?? '').trim();
  if (!id) {
    rt.io.error(chalk.red('error:') + ' customer id is required');
    return 1;
  }
  const token = await rt.resolveToken();
  const apiUrl = await rt.resolveApiUrl();
  const api = rt.apiFactory(token, apiUrl);

  const sp = rt.spinner(`Unsuspending customer ${chalk.cyan(id)}…`).start();
  try {
    const result = await api.unsuspendCustomer(id);
    sp.succeed(`Customer ${chalk.cyan(id)} unsuspended`);
    emit(
      result,
      opts,
      (r) => [
        `  ${chalk.bold('customer_id:')} ${r.customer_id}`,
        `  ${chalk.bold('unsuspended_at:')} ${r.unsuspended_at}`,
      ],
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    return handleError(sp, rt, 'unsuspend', err);
  }
}

function handleError(
  sp: ReturnType<CommandRuntime['spinner']>,
  rt: CommandRuntime,
  verb: string,
  err: unknown,
): number {
  if (err instanceof AdminApiError && err.status === 404) {
    sp.fail(`Endpoint not found (${verb})`);
    rt.io.error(chalk.dim('  The /api/superadmin route is not deployed on this environment yet.'));
    return 2;
  }
  sp.fail(`Failed to ${verb}`);
  rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
  return 1;
}
