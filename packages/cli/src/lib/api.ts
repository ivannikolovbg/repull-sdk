/**
 * Thin Studio API client used by the CLI.
 *
 * Endpoints (all under `${apiUrl}`):
 *   - POST   /api/studio/projects                                 → create project
 *   - GET    /api/studio/projects/{id}/files                      → list files
 *   - GET    /api/studio/projects/{id}/files/raw?path=...         → download single file
 *   - PUT    /api/studio/projects/{id}/files                      → upload single file
 *   - POST   /api/studio/deployments                              → trigger deploy
 *   - GET    /api/studio/deployments/{id}                         → poll deploy status
 *   - GET    /api/studio/projects/{id}/deployments?limit=1        → latest deployment
 *   - GET    /api/studio/deployments/{id}/logs?tail=N             → tail logs
 *
 * The fetch impl is injectable so tests can mock the wire without monkey-patching globals.
 */

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface StudioApiOptions {
  apiKey: string;
  apiUrl: string;
  fetch?: FetchLike;
  userAgent?: string;
}

export interface StudioProject {
  id: string;
  slug: string;
  name: string;
  url?: string;
  created_at?: string;
}

export interface StudioFile {
  path: string;
  size?: number;
  updated_at?: string;
}

export interface StudioFileContent {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

export type StudioDeploymentStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'cancelled';

export interface StudioDeployment {
  id: string;
  project_id: string;
  status: StudioDeploymentStatus;
  url?: string;
  error?: string;
  created_at?: string;
}

export interface StudioLogLine {
  timestamp: string;
  level?: string;
  message: string;
}

export interface StudioLogsResponse {
  deployment_id: string;
  logs: StudioLogLine[];
}

export class StudioApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'StudioApiError';
    this.status = status;
    this.body = body;
  }
}

export interface StudioApi {
  createProject(input: { name: string; slug?: string }): Promise<StudioProject>;
  listFiles(projectId: string): Promise<StudioFile[]>;
  getFile(projectId: string, filePath: string): Promise<StudioFileContent>;
  putFile(projectId: string, file: StudioFileContent): Promise<{ ok: true; path: string }>;
  createDeployment(projectId: string): Promise<StudioDeployment>;
  getDeployment(deploymentId: string): Promise<StudioDeployment>;
  getLatestDeployment(projectId: string): Promise<StudioDeployment | null>;
  getLogs(deploymentId: string, tail?: number): Promise<StudioLogsResponse>;
}

export function createStudioApi(opts: StudioApiOptions): StudioApi {
  const fetchImpl: FetchLike = opts.fetch ?? ((globalThis.fetch as FetchLike | undefined) ?? failNoFetch);
  const baseUrl = opts.apiUrl.replace(/\/+$/, '');
  const userAgent = opts.userAgent ?? '@repull/cli/0.1.0';

  async function request<T>(
    method: string,
    pathname: string,
    init: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${baseUrl}${pathname}`);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.apiKey}`,
      Accept: 'application/json',
      'User-Agent': userAgent,
    };
    let body: BodyInit | undefined;
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.body);
    }
    const res = await fetchImpl(url.toString(), { method, headers, body });
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const message =
        (parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error: unknown }).error === 'string'
          ? (parsed as { error: string }).error
          : undefined) ?? `${method} ${pathname} failed with ${res.status}`;
      throw new StudioApiError(res.status, message, parsed);
    }
    return parsed as T;
  }

  return {
    createProject(input) {
      return request<StudioProject>('POST', '/api/studio/projects', { body: input });
    },
    listFiles(projectId) {
      return request<{ files: StudioFile[] }>(
        'GET',
        `/api/studio/projects/${encodeURIComponent(projectId)}/files`,
      ).then((r) => r.files ?? []);
    },
    getFile(projectId, filePath) {
      return request<StudioFileContent>(
        'GET',
        `/api/studio/projects/${encodeURIComponent(projectId)}/files/raw`,
        { query: { path: filePath } },
      );
    },
    putFile(projectId, file) {
      return request<{ ok: true; path: string }>(
        'PUT',
        `/api/studio/projects/${encodeURIComponent(projectId)}/files`,
        { body: file },
      );
    },
    createDeployment(projectId) {
      return request<StudioDeployment>('POST', '/api/studio/deployments', {
        body: { project_id: projectId },
      });
    },
    getDeployment(deploymentId) {
      return request<StudioDeployment>(
        'GET',
        `/api/studio/deployments/${encodeURIComponent(deploymentId)}`,
      );
    },
    getLatestDeployment(projectId) {
      return request<{ deployments: StudioDeployment[] }>(
        'GET',
        `/api/studio/projects/${encodeURIComponent(projectId)}/deployments`,
        { query: { limit: 1 } },
      ).then((r) => r.deployments?.[0] ?? null);
    },
    getLogs(deploymentId, tail) {
      return request<StudioLogsResponse>(
        'GET',
        `/api/studio/deployments/${encodeURIComponent(deploymentId)}/logs`,
        { query: { tail } },
      );
    },
  };
}

function failNoFetch(): Promise<Response> {
  return Promise.reject(
    new Error('No global fetch available. Run on Node 20+ or pass a custom fetch.'),
  );
}
