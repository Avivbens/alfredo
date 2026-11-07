import { vi } from 'vitest';
import type { Cache } from './cache.service';

/** `vi.fn()` cannot express the generic `get<T>`, so the fake is cast once here instead of in every spec */
export function toMapCache(entries: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(entries));
  const fake = {
    get: vi.fn((key: string) => store.get(key) ?? null),
    setWithTTL: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
  };

  return { cache: fake as unknown as Cache, fake, store };
}
