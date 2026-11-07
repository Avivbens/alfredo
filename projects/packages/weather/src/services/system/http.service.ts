import { REQUEST_TIMEOUT_MS } from '../../config/constants';

/** A hung request would keep Alfred's list empty, so every call gives up after the timeout */
export async function fetchJson(url: string, service: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${service} answered HTTP ${response.status}`);
  }

  return response.json();
}
