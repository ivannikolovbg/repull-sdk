import { describe, it, expect, vi } from 'vitest';
import { createStudioApi, StudioApiError, type FetchLike } from '../src/lib/api.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createStudioApi', () => {
  it('attaches Authorization + UA headers and returns parsed JSON on createProject', async () => {
    const fetchMock = vi.fn<Parameters<FetchLike>, ReturnType<FetchLike>>(async (_url, init) => {
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer sk_test_x');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('@repull/cli/0.1.0');
      expect(init?.body).toBe(JSON.stringify({ name: 'My site' }));
      return jsonResponse(200, { id: 'proj_1', slug: 'my-site', name: 'My site' });
    });

    const api = createStudioApi({
      apiKey: 'sk_test_x',
      apiUrl: 'https://api.example.com',
      fetch: fetchMock,
    });
    const project = await api.createProject({ name: 'My site' });
    expect(project.id).toBe('proj_1');
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0]![0];
    expect(String(url)).toBe('https://api.example.com/api/studio/projects');
  });

  it('throws StudioApiError with API message on non-2xx', async () => {
    const fetchMock: FetchLike = async () =>
      jsonResponse(403, { error: 'forbidden — bad key' });
    const api = createStudioApi({
      apiKey: 'sk_bad',
      apiUrl: 'https://api.example.com',
      fetch: fetchMock,
    });
    await expect(api.listFiles('proj_1')).rejects.toBeInstanceOf(StudioApiError);
    await expect(api.listFiles('proj_1')).rejects.toThrow(/forbidden/);
  });

  it('encodes query params on getFile and getLogs', async () => {
    const calls: string[] = [];
    const fetchMock: FetchLike = async (url) => {
      calls.push(String(url));
      if (String(url).includes('/files/raw')) {
        return jsonResponse(200, { path: 'index.html', content: '<h1>hi</h1>' });
      }
      return jsonResponse(200, { deployment_id: 'dep_1', logs: [] });
    };
    const api = createStudioApi({
      apiKey: 'k',
      apiUrl: 'https://api.example.com',
      fetch: fetchMock,
    });
    await api.getFile('proj_1', 'src/app.ts');
    await api.getLogs('dep_1', 50);
    expect(calls[0]).toContain('path=src%2Fapp.ts');
    expect(calls[1]).toContain('tail=50');
  });

  it('strips trailing slashes from baseUrl', async () => {
    const fetchMock: FetchLike = async (url) => {
      expect(String(url)).toBe('https://api.example.com/api/studio/projects');
      return jsonResponse(200, { id: 'p', slug: 's', name: 'n' });
    };
    const api = createStudioApi({
      apiKey: 'k',
      apiUrl: 'https://api.example.com/////',
      fetch: fetchMock,
    });
    await api.createProject({ name: 'n' });
  });

  it('gitInit POSTs JSON, returns the binary body and decoded headers', async () => {
    const tarBytes = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x42]); // not a real gz, fine for this test
    const fetchMock = vi.fn<Parameters<FetchLike>, ReturnType<FetchLike>>(async (url, init) => {
      expect(String(url)).toBe(
        'https://api.example.com/api/studio/projects/proj_abc/git/init',
      );
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer k');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('@repull/cli/0.1.0');
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        remote: 'https://github.com/me/x.git',
        branch: 'trunk',
      });
      return new Response(tarBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': 'attachment; filename="my-app-git.tar.gz"',
          'X-Studio-Git-Branch': 'trunk',
          'X-Studio-Git-Slug': 'my-app',
          'X-Repull-Push-Instructions': JSON.stringify([
            { label: 'Add remote', command: 'git remote add origin https://github.com/me/x.git' },
            { label: 'Push', command: 'git push -u origin trunk' },
          ]),
        },
      });
    });
    const api = createStudioApi({
      apiKey: 'k',
      apiUrl: 'https://api.example.com',
      fetch: fetchMock,
    });
    const res = await api.gitInit('proj_abc', {
      remote: 'https://github.com/me/x.git',
      branch: 'trunk',
    });
    expect(res.filename).toBe('my-app-git.tar.gz');
    expect(res.branch).toBe('trunk');
    expect(res.slug).toBe('my-app');
    expect(Array.from(res.body)).toEqual(Array.from(tarBytes));
    expect(res.pushInstructions).toEqual([
      { label: 'Add remote', command: 'git remote add origin https://github.com/me/x.git' },
      { label: 'Push', command: 'git push -u origin trunk' },
    ]);
  });

  it('gitInit raises StudioApiError on a non-2xx with the API message', async () => {
    const fetchMock: FetchLike = async () =>
      jsonResponse(400, { error: { code: 'invalid_remote', message: 'Invalid remote URL' } });
    const api = createStudioApi({
      apiKey: 'k',
      apiUrl: 'https://api.example.com',
      fetch: fetchMock,
    });
    await expect(api.gitInit('proj_abc', { remote: 'bad' })).rejects.toBeInstanceOf(
      StudioApiError,
    );
    await expect(api.gitInit('proj_abc', { remote: 'bad' })).rejects.toThrow(/Invalid remote/);
  });
});
