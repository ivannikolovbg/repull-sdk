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
});
