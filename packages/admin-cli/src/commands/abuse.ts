import chalk from 'chalk';
import type { CommandRuntime } from '../lib/runtime.js';
import { AdminApiError } from '../lib/api.js';
import { parseSince } from '../lib/since.js';
import { renderTable, colorSeverity, emit } from '../lib/format.js';

export interface AbuseListOptions {
  since?: string;
  json?: boolean;
}

export async function runAbuseList(
  opts: AbuseListOptions,
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

  const sp = rt.spinner(`Loading abuse signals${sinceIso ? ` since ${sinceIso}` : ''}…`).start();
  try {
    const signals = await api.listAbuseSignals(sinceIso);
    sp.succeed(`Loaded ${signals.length} signal${signals.length === 1 ? '' : 's'}`);
    emit(
      signals,
      opts,
      (rows) => {
        if (rows.length === 0) {
          return [chalk.dim('  (none)')];
        }
        return [
          renderTable({
            head: ['ID', 'Customer', 'Kind', 'Severity', 'Detected', 'Message'],
            rows: rows.map((s) => [
              s.id,
              s.customer_id ?? '-',
              s.kind,
              colorSeverity(s.severity),
              s.detected_at,
              s.message ?? '',
            ]),
          }),
        ];
      },
      (line) => rt.io.log(line),
    );
    return 0;
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      sp.fail('abuse-signals endpoint not deployed');
      rt.io.error(chalk.dim('  /api/superadmin/abuse-signals is not yet live on this environment.'));
      return 2;
    }
    sp.fail('Failed to load abuse signals');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}
