/*
 * A small in-memory cache for the market data fetchers, so the free API
 * plans' rate limits hold. It lives as long as the function instance (a
 * cold start fetches again). When a refresh fails, the last good value is
 * served until it is twice its age limit, then the error goes through.
 */
const store = new Map();
const pending = new Map();

export async function cached(key, ttlMs, fetcher) {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.value;
  if (pending.has(key)) return pending.get(key);
  const p = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { value, at: Date.now() });
      return value;
    } catch (e) {
      if (hit && now - hit.at < ttlMs * 2) return hit.value;
      throw e;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, p);
  return p;
}

// Runs a fetcher and returns null instead of throwing: one source being
// down must not take the dashboard with it.
export async function quiet(fn) {
  try { return await fn(); } catch (e) {
    console.log("market source failed:", (e && e.message) || e);
    return null;
  }
}

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
