'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type QueryParams } from './api';

export interface ApiState<T> {
  data: T | undefined;
  error: ApiError | null;
  /** True only while the very first request is in flight. */
  loading: boolean;
  /** True while any (re)fetch is in flight. */
  fetching: boolean;
  reload: () => Promise<void>;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/**
 * Declarative GET with loading / error state. Pass `null` as the path to skip fetching.
 * `pollMs` re-fetches quietly in the background (used by messaging and notification badges).
 */
export function useApi<T>(path: string | null, params?: QueryParams, options?: { pollMs?: number }): ApiState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [fetching, setFetching] = useState(path !== null);
  const seq = useRef(0);
  const key = path === null ? null : `${path}?${JSON.stringify(params ?? {})}`;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const run = useCallback(
    async (quiet: boolean) => {
      if (path === null) return;
      const id = ++seq.current;
      if (!quiet) setFetching(true);
      try {
        const result = await api.get<T>(path, paramsRef.current);
        if (id !== seq.current) return;
        setDataState(result);
        setError(null);
      } catch (err) {
        if (id !== seq.current) return;
        if (!quiet || !data) setError(err instanceof ApiError ? err : new ApiError(500, 'Something went wrong.'));
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setFetching(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    if (key === null) {
      setLoading(false);
      setFetching(false);
      return;
    }
    setError(null);
    void run(false);
    return () => {
      // Intentionally read at cleanup time: bumping the counter invalidates any in-flight request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      seq.current++;
    };
  }, [key, run]);

  useEffect(() => {
    if (!options?.pollMs || key === null) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void run(true);
    }, options.pollMs);
    return () => window.clearInterval(timer);
  }, [options?.pollMs, key, run]);

  const reload = useCallback(() => run(false), [run]);
  const setData = useCallback((updater: (prev: T | undefined) => T | undefined) => setDataState((prev) => updater(prev)), []);

  return { data, error, loading, fetching, reload, setData };
}
