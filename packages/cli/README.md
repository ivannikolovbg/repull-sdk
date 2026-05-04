# @repull/cli

The Repull Studio CLI. Scaffold a Studio project, sync files, deploy, tail logs, and pop the IDE — all from your terminal.

```bash
npm i -g @repull/cli
# or run on demand
npx @repull/cli studio --help
```

## Authentication

The CLI reads your API key in this order:

1. `REPULL_API_KEY` environment variable
2. `~/.repull/config.json` with shape `{ "api_key": "sk_live_..." }`

```bash
export REPULL_API_KEY=sk_live_xxxxxxxxxxxxxxxx
```

## Commands

```text
repull --help
repull studio --help
```

| Command                          | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `repull studio init <name>`      | Create a Studio project and write `./repull-studio.json` (project_id, slug, api_url). |
| `repull studio pull`             | Download every file from the linked project into the current directory. |
| `repull studio push <path>`      | Upload a single file (text auto-detected, binaries base64-encoded).     |
| `repull studio deploy`           | Trigger a deployment and poll until it goes `live` (or fails).          |
| `repull studio logs --tail <N>`  | Tail the latest deployment's logs.                                      |
| `repull studio open`             | Open `https://repull.dev/studio/{project_id}` in your default browser.  |

## `repull-studio.json`

Created by `init` and read by every other command:

```json
{
  "project_id": "proj_abc",
  "slug": "my-studio",
  "api_url": "https://api.repull.dev"
}
```

`api_url` is optional and defaults to `https://api.repull.dev`. Override it with `--api-url` on `init` if you're hitting a private/staging API.

## Development

```bash
pnpm --filter @repull/cli build
pnpm --filter @repull/cli test
node packages/cli/dist/cli.js --help
```

Tests use [Vitest](https://vitest.dev) and never hit the live API — every command is exercised against an injected mock `StudioApi`.

## License

See [LICENSE.md](../../LICENSE.md) at the repo root.
