import chalk from 'chalk';
import {
  DEFAULT_API_URL,
  STUDIO_CONFIG_FILENAME,
  writeStudioConfig,
} from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';

export interface InitOptions {
  apiUrl?: string;
}

export async function runInit(
  name: string,
  opts: InitOptions,
  rt: CommandRuntime,
): Promise<number> {
  if (!name || !name.trim()) {
    rt.io.error(chalk.red('error:') + ' project name is required (e.g. `repull studio init my-site`)');
    return 1;
  }
  const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
  const apiKey = await rt.resolveApiKey();
  const api = rt.apiFactory(apiKey, apiUrl);
  const sp = rt.spinner(`Creating Studio project ${chalk.cyan(name)}…`).start();
  try {
    const project = await api.createProject({ name });
    sp.succeed(`Created ${chalk.green(project.slug)} (${chalk.dim(project.id)})`);
    const cfgPath = await writeStudioConfig(
      { project_id: project.id, slug: project.slug, api_url: apiUrl },
      rt.cwd(),
    );
    rt.io.log(chalk.dim(`  → ${cfgPath}`));
    rt.io.log('');
    rt.io.log(`Next steps:`);
    rt.io.log(`  ${chalk.dim('$')} repull studio pull       ${chalk.dim('# fetch starter files')}`);
    rt.io.log(`  ${chalk.dim('$')} repull studio open       ${chalk.dim('# edit in the browser IDE')}`);
    rt.io.log(`  ${chalk.dim('$')} repull studio deploy     ${chalk.dim('# ship it')}`);
    return 0;
  } catch (err) {
    sp.fail(`Failed to create project`);
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    rt.io.error(chalk.dim(`  Studio config not written to ${STUDIO_CONFIG_FILENAME}.`));
    return 1;
  }
}
