const BASE_URL = process.env.CBB_API_BASE_URL!;
const API_KEY = process.env.CBB_API_KEY!;

const NON_CACHEABLE_ENDPOINTS = new Set(['/games']);

export async function cbbFetch<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
  }

  const shouldBypassDataCache = NON_CACHEABLE_ENDPOINTS.has(endpoint);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json'
    },
    ...(shouldBypassDataCache ? { cache: 'no-store' } : { next: { revalidate: 300 } })
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText} — ${endpoint}`);
  }

  return res.json();
}
