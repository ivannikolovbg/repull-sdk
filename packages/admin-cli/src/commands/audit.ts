import chalk from 'chalk';
import type { CommandRuntime } from '../lib/runtime.js';
import { AdminApiError } from '../lib/api.js';
import { parseSince } from '../lib/since.js';
import { renderTable, emit } from '../lib/format.js';

export interface AuditQueryOptions {
  customer?: string;
  since?: string;
  limit?: number;
  json?: boolean;
}

export async function runAuditQuery(
  opts: AuditQueryOptions,
  rt: CommandRuntime,
): Promise<number> {
  let sinceIso: string | undefined;
  try {
    sinceIso = parseSince(opts.since, rt.now());
  } catch (err) {
    rt.io.error(chalk.red('error:') + ' ' + (err instanceof Error ? err.message : String(err)));
    return 1;
  }

  const token = await rt.resolveToken();
  const apiUrl = await rt.resolveApiUrl();
  const api = rt.apiFactory(token, apiUrl);

  const sp = rt
    .spinner(
      `Querying audit log${opts.customer ? ` for customer ${opts.customer}` : ''}${sinceIso ? ` since ${sinceIso}` : ''}…`,
    )
    .start();
  try {
    const entries = await api.queryAuditLog({
      customerId: opts.customer,
      since: sinceIso,
      limit: opts.limit,
    });
    sp.succeed(`Loaded ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`);
    emit(
      entries,
      opts,
      (rows) => {
        if (rows.length === 0) {
          return [chalk.dim('  (none)')];
        }
        return [
          renderTable({
            head: ['When', 'Customer', 'Actor', 'Action', 'Target'],
            rows: rows.map((e) => [
              e.occurred_at,
              e.customer_id ?? '-',
              e.actor ?? '-',
              e.action,
              e.target ?? '',
            ]),
          }),
        ];
      },
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      sp.fail('audit-log endpoint not deployed');
      rt.io.error(chalk.dim('  /api/superadmin/studio/audit-log is not yet live on this environment.'));
      return 2;
    }
    sp.fail('Failed to query audit log');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}
