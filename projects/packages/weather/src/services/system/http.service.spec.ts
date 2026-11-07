import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJson } from './http.service';

describe('http.service', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchJson', () => {
    it('should return the parsed body with a timeout on the request', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

      await expect(fetchJson('https://example.com/a', 'Example')).resolves.toEqual({ ok: 1 });
      expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    });

    it('should reject with the service name and the HTTP status', async () => {
      fetchMock.mockResolvedValue(new Response('busy', { status: 500 }));

      await expect(fetchJson('https://example.com/a', 'Open-Meteo')).rejects.toThrow('Open-Meteo answered HTTP 500');
    });
  });
});
