#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runInit } from './commands/init.js';
import { runPull } from './commands/pull.js';
import { runPush } from './commands/push.js';
import { runDeploy } from './commands/deploy.js';
import { runLogs } from './commands/logs.js';
import { runOpen } from './commands/open.js';
import { runGitInit } from './commands/git-init.js';
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
    .name('repull')
    .description(`Repull CLI ${chalk.dim(`v${CLI_VERSION}`)} — manage Studio projects from your terminal.`)
    .version(CLI_VERSION, '-v, --version', 'output the version number');

  const studio = program.command('studio').description('Studio project commands');

  studio
    .command('init <name>')
    .description('Create a new Studio project and write ./repull-studio.json')
    .option('--api-url <url>', 'override the Repull API URL (defaults to https://api.repull.dev)')
    .action(async (name: string, options: { apiUrl?: string }) => {
      const code = await runInit(name, { apiUrl: options.apiUrl }, rt);
      exit(code);
    });

  studio
    .command('pull')
    .description('Download all files from the linked Studio project into the current directory')
    .action(async () => {
      const code = await runPull(rt);
      exit(code);
    });

  studio
    .command('push [path]')
    .description('Upload a file to the linked Studio project')
    .action(async (filePath: string | undefined) => {
      const code = await runPush(filePath, rt);
      exit(code);
    });

  studio
    .command('deploy')
    .description('Trigger a Studio deployment and poll until it goes live')
    .action(async () => {
      const code = await runDeploy({}, rt);
      exit(code);
    });

  studio
    .command('logs')
    .description('Tail logs from the latest Studio deployment')
    .option('--tail <n>', 'number of recent log lines to show', (v) => Number.parseInt(v, 10), 100)
    .action(async (options: { tail: number }) => {
      const code = await runLogs({ tail: options.tail }, rt);
      exit(code);
    });

  studio
    .command('open')
    .description('Open the Studio IDE for the linked project in your browser')
    .action(async () => {
      const code = await runOpen(rt);
      exit(code);
    });

  studio
    .command('git-init')
    .description(
      'Init a git repo from the linked Studio project and download it as <slug>-git.tar.gz',
    )
    .option('--remote <url>', 'remote URL to echo into push instructions (and --push to)')
    .option('--branch <name>', 'branch name for the initial commit (default: main)')
    .option('--push', 'after extracting, run `git remote add origin <url>` + `git push -u origin <branch>` (requires --remote)')
    .action(async (options: { remote?: string; branch?: string; push?: boolean }) => {
      const code = await runGitInit(
        { remote: options.remote, branch: options.branch, push: options.push },
        rt,
      );
      exit(code);
    });

  return program;
}

// Run when invoked directly (production binary path).
const isDirectInvocation = (() => {
  try {
    if (typeof process === 'undefined' || !process.argv?.[1]) return false;
    const entry = process.argv[1];
    return /\bcli(\.js|\.cjs|\.mjs)?$/.test(entry) || /\brepull$/.test(entry);
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
