# @repull/admin-cli

`repull-admin` — internal ops CLI for the Repull superadmin surface.

> This package is **private** (`"private": true`). It is not published to npm.
> Build it from source inside this monorepo and run the binary directly.

## Build

```bash
pnpm install
pnpm --filter @repull/admin-cli build
node packages/admin-cli/dist/cli.js --help
```

## Authentication

The CLI authenticates against the `dominator` superadmin endpoints with a
bearer token. It looks up the token in this order:

1. `SUPERADMIN_TOKEN` environment variable.
2. `~/.repull/admin.json` with shape `{ "superadmin_token": "...", "api_url": "..." }`.

```bash
export SUPERADMIN_TOKEN=sk_admin_xxxxxxxxxxxxxxxx
# Optional — override the API host (default: https://api.repull.dev)
export REPULL_ADMIN_API_URL=https://staging.repull.dev
```

## Commands

```text
repull-admin --help
```

| Command                                            | Endpoint                                                | Notes                                              |
| -------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `repull-admin customer suspend <id> --reason "…"`  | `POST /api/superadmin/customer/<id>/suspend`            | Recorded with reason in the audit log.             |
| `repull-admin customer unsuspend <id>`             | `DELETE /api/superadmin/customer/<id>/suspend`          |                                                    |
| `repull-admin project purge <projectId>`           | `POST /api/superadmin/projects/<id>/purge`              | Skips the 30-day soft-delete window. Confirm prompt. Use `--yes` to skip. |
| `repull-admin abuse list --since 24h`              | `GET /api/superadmin/abuse-signals?since=…`             | Accepts `24h`, `7d`, `30m`, `2w`, or ISO-8601.     |
| `repull-admin audit query --customer <id> --since 7d` | `GET /api/superadmin/studio/audit-log?…`             | `--limit` defaults to 100.                         |
| `repull-admin deploy replay <deploymentId>`        | `POST /api/superadmin/deployments/<id>/replay`          | Re-queues a failed deployment.                     |
| `repull-admin host drain <hostId>`                 | `POST /api/superadmin/hosts/<id>/drain`                 | Marks the host unhealthy in `studio_hosts`. Confirm prompt. Use `--yes` to skip. |

All commands accept `--json` for machine-readable output.

## Sample sessions

```bash
# Suspend a customer with an explanation
repull-admin customer suspend 10 --reason "fraud-flagged, pending review"

# Lift the suspension
repull-admin customer unsuspend 10

# Force-purge a soft-deleted project (skips the 30-day window)
repull-admin project purge proj_abc123 --yes

# Pull abuse signals from the last 24 hours as JSON
repull-admin abuse list --since 24h --json

# Audit log for one customer over the last week
repull-admin audit query --customer 10 --since 7d --limit 50

# Re-trigger a failed deployment
repull-admin deploy replay dep_z9y8x7

# Drain a misbehaving host (with confirmation)
repull-admin host drain host_node-7
```

## Expected endpoint contracts

If a `/api/superadmin/...` route is not yet deployed, the CLI returns exit code
`2` and prints an actionable hint. The expected request/response shapes are:

### `POST /api/superadmin/customer/<id>/suspend`

Request body: `{ "reason": "..." }` (optional).
Response: `{ "ok": true, "customer_id": <id>, "suspended_at": "<iso>", "reason": "..." }`.

### `DELETE /api/superadmin/customer/<id>/suspend`

Response: `{ "ok": true, "customer_id": <id>, "unsuspended_at": "<iso>" }`.

### `POST /api/superadmin/projects/<id>/purge`

Request body: `{ "force": true, "skip_soft_delete": true }`.
Response: `{ "ok": true, "project_id": "...", "purged_at": "<iso>", "rows_deleted": <int> }`.

### `GET /api/superadmin/abuse-signals?since=<iso>`

Response: `{ "signals": [{ "id": "...", "customer_id": ..., "kind": "...", "severity": "low|medium|high|critical", "detected_at": "<iso>", "message": "..." }] }`.

### `GET /api/superadmin/studio/audit-log?customer_id=<id>&since=<iso>&limit=<n>`

Response: `{ "entries": [{ "id": "...", "customer_id": ..., "actor": "...", "action": "...", "target": "...", "occurred_at": "<iso>", "metadata": { ... } }] }`.

### `POST /api/superadmin/deployments/<id>/replay`

Response: `{ "ok": true, "deployment_id": "...", "new_deployment_id": "...", "status": "queued|building|..." }`.

### `POST /api/superadmin/hosts/<id>/drain`

Response: `{ "ok": true, "host_id": "...", "drained_at": "<iso>", "containers_evacuated": <int> }`.

## Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | Success                                                     |
| `1`  | Validation error or generic API failure                     |
| `2`  | Endpoint returned `404` — likely not deployed yet           |

## Development

```bash
pnpm --filter @repull/admin-cli build
pnpm --filter @repull/admin-cli test
node packages/admin-cli/dist/cli.js --help
```

Tests run on [Vitest](https://vitest.dev) and **never hit the live API** —
every command is exercised against an injected mock `AdminApi` (see
`tests/_mocks.ts`).

## License

See [LICENSE.md](../../LICENSE.md) at the repo root.
