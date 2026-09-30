/**
 * Thin fetch wrapper around the NestJS REST API. All calls go to same-origin `/api/*`, which Next.js proxies
 * to the backend. Errors are normalised into `ApiError` with user-safe messages (never raw stack traces).
 */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

const TOKEN_KEY = 'tc.token';

/**
 * The session token lives in localStorage. Some embedded or privacy-restricted browsers block or partition
 * storage, so we fall back to sessionStorage and finally to memory; sign-in then still works for the
 * current page session instead of silently bouncing the user back to the login screen.
 */
let memoryToken: string | null = null;

function storages(): Storage[] {
  const out: Storage[] = [];
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      out.push(window[name]);
    } catch {
      /* storage blocked by the browser */
    }
  }
  return out;
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    for (const store of storages()) {
      try {
        const value = store.getItem(TOKEN_KEY);
        if (value) return value;
      } catch {
        /* try the next store */
      }
    }
    return memoryToken;
  },
  set(token: string) {
    memoryToken = token;
    for (const store of storages()) {
      try {
        store.setItem(TOKEN_KEY, token);
        return;
      } catch {
        /* try the next store */
      }
    }
  },
  clear() {
    memoryToken = null;
    for (const store of storages()) {
      try {
        store.removeItem(TOKEN_KEY);
      } catch {
        /* nothing to clear */
      }
    }
  },
};

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  0: 'We could not reach the server. Check your connection and try again.',
  400: 'That request could not be processed.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with the current state of the data.',
  422: 'Some of the information you entered is not valid.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again shortly.',
};

export function friendlyMessage(status: number, serverMessage?: string): string {
  if (status >= 500) return FALLBACK_MESSAGES[500];
  if (serverMessage && status !== 404) return serverMessage;
  return FALLBACK_MESSAGES[status] ?? serverMessage ?? FALLBACK_MESSAGES[500];
}

function buildUrl(path: string, params?: QueryParams) {
  const url = new URL(`/api${path}`, 'http://placeholder.local');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return `${url.pathname}${url.search}`;
}

interface RequestOptions {
  params?: QueryParams;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  /** Skip the global 401 handler (used by the login form, where 401 means "wrong password"). */
  silent401?: boolean;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.params), { method, headers, body, signal: opts.signal, cache: 'no-store' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, FALLBACK_MESSAGES[0]);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    const payload = (data ?? {}) as { message?: string | string[]; errors?: Record<string, string[]> };
    const raw = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
    if (res.status === 401 && !opts.silent401 && tokenStore.get()) unauthorizedHandler?.();
    throw new ApiError(res.status, friendlyMessage(res.status, raw), payload.errors);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal) => request<T>('GET', path, { params, signal }),
  post: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, 'silent401'>) => request<T>('POST', path, { body, ...opts }),
  patch: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, 'silent401'>) => request<T>('PATCH', path, { body, ...opts }),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(method: 'POST' | 'PATCH', path: string, form: FormData) => request<T>(method, path, { form }),

  /** Authenticated file download (e.g. CSV reports). */
  async download(path: string, params: QueryParams, filename: string) {
    const token = tokenStore.get();
    let res: Response;
    try {
      res = await fetch(buildUrl(path, params), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      throw new ApiError(0, FALLBACK_MESSAGES[0]);
    }
    if (!res.ok) throw new ApiError(res.status, friendlyMessage(res.status));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return FALLBACK_MESSAGES[500];
}
