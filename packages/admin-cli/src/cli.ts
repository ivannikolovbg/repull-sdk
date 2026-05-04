#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runSuspend, runUnsuspend } from './commands/customer.js';
import { runPurgeProject } from './commands/project.js';
import { runAbuseList } from './commands/abuse.js';
import { runAuditQuery } from './commands/audit.js';
import { runReplayDeploy } from './commands/deploy.js';
import { runDrainHost } from './commands/host.js';
import { defaultRuntime, type CommandRuntime } from './lib/runtime.js';

export const CLI_VERSION = '0.1.0';

export interface BuildCliOptions {
  runtime?: CommandRuntime;
  exit?: (code: number) => void;
}

/**
 * Builds the commander program. Exposed as a function so tests can build
 * an instance with a mock runtime and exercise `parseAsync`.
 */
export function buildCli(opts: BuildCliOptions = {}): Command {
  const rt = opts.runtime ?? defaultRuntime();
  const exit = opts.exit ?? ((code: number) => process.exit(code));

  const program = new Command();
  program
    .name('repull-admin')
    .description(`Repull admin CLI ${chalk.dim(`v${CLI_VERSION}`)} — superadmin ops tooling.`)
    .version(CLI_VERSION, '-v, --version', 'output the version number');

  // ----- customer suspend / unsuspend ---------------------------------------
  const customer = program.command('customer').description('Customer ops (suspend/unsuspend)');

  customer
    .command('suspend <customerId>')
    .description('Suspend a customer (POST /api/superadmin/customer/<id>/suspend)')
    .option('--reason <reason>', 'human-readable reason recorded with the suspension')
    .option('--json', 'emit machine-readable JSON output')
    .action(async (customerId: string, options: { reason?: string; json?: boolean }) => {
      const code = await runSuspend(customerId, options, rt);
      exit(code);
    });

  customer
    .command('unsuspend <customerId>')
    .description('Lift a suspension (DELETE /api/superadmin/customer/<id>/suspend)')
    .option('--json', 'emit machine-readable JSON output')
    .action(async (customerId: string, options: { json?: boolean }) => {
      const code = await runUnsuspend(customerId, options, rt);
      exit(code);
    });

  // ----- project purge ------------------------------------------------------
  const project = program.command('project').description('Project ops (force-purge)');

  project
    .command('purge <projectId>')
    .description('Force-purge a single project — skips the 30-day soft-delete window')
    .option('-y, --yes', 'skip the confirmation prompt')
    .option('--json', 'emit machine-readable JSON output')
    .action(async (projectId: string, options: { yes?: boolean; json?: boolean }) => {
      const code = await runPurgeProject(projectId, options, rt);
      exit(code);
    });

  // ----- abuse signals ------------------------------------------------------
  const abuse = program.command('abuse').description('Abuse signals');

  abuse
    .command('list')
    .description('Fetch abuse signals (GET /api/superadmin/abuse-signals)')
    .option('--since <duration>', 'relative window like 24h, 7d, 30m, 2w (or ISO-8601)', '24h')
    .option('--json', 'emit machine-readable JSON output')
    .action(async (options: { since?: string; json?: boolean }) => {
      const code = await runAbuseList(options, rt);
      exit(code);
    });

  // ----- audit log ----------------------------------------------------------
  const audit = program.command('audit').description('Audit log');

  audit
    .command('query')
    .description('Query the studio audit log (GET /api/superadmin/studio/audit-log)')
    .option('--customer <id>', 'restrict to one customer id')
    .option('--since <duration>', 'relative window like 24h, 7d, 30m, 2w (or ISO-8601)', '7d')
    .option('--limit <n>', 'maximum entries to return', (v) => Number.parseInt(v, 10), 100)
    .option('--json', 'emit machine-readable JSON output')
    .action(async (options: { customer?: string; since?: string; limit?: number; json?: boolean }) => {
      const code = await runAuditQuery(options, rt);
      exit(code);
    });

  // ----- deploy replay ------------------------------------------------------
  const deploy = program.command('deploy').description('Deployment ops (replay)');

  deploy
    .command('replay <deploymentId>')
    .description('Re-trigger a failed deployment (POST /api/superadmin/deployments/<id>/replay)')
    .option('--json', 'emit machine-readable JSON output')
    .action(async (deploymentId: string, options: { json?: boolean }) => {
      const code = await runReplayDeploy(deploymentId, options, rt);
      exit(code);
    });

  // ----- host drain ---------------------------------------------------------
  const host = program.command('host').description('Host ops (drain)');

  host
    .command('drain <hostId>')
    .description('Mark a host unhealthy in studio_hosts so it drains containers')
    .option('-y, --yes', 'skip the confirmation prompt')
    .option('--json', 'emit machine-readable JSON output')
    .action(async (hostId: string, options: { yes?: boolean; json?: boolean }) => {
      const code = await runDrainHost(hostId, options, rt);
      exit(code);
    });

  return program;
}

// Run when invoked directly (production binary path).
const isDirectInvocation = (() => {
  try {
    if (typeof process === 'undefined' || !process.argv?.[1]) return false;
    const entry = process.argv[1];
    return /\bcli(\.js|\.cjs|\.mjs)?$/.test(entry) || /\brepull-admin$/.test(entry);
  } catch {
    return false;
  }
})();

if (isDirectInvocation) {
  buildCli().parseAsync(process.argv).catch((err) => {
    process.stderr.write(`${chalk.red('error:')} ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
