'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, errorMessage } from './api';
import { useToast } from './toast';

const noopSubscribe = () => () => {};
/** False during server rendering and before React has attached to the page; true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Maps a 422 response (`errors: { field: [messages] }`) onto react-hook-form fields. Returns true if any field matched. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): boolean {
  if (!(err instanceof ApiError) || !err.errors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(err.errors)) {
    setError(field as Path<T>, { type: 'server', message: messages[0] });
    applied = true;
  }
  return applied;
}

/**
 * Runs an async action with a busy key and toast feedback. Returns the result, or `undefined` if it failed
 * (the failure has already been shown to the user).
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(key);
      try {
        const result = await fn();
        if (success) toast.success(success);
        return result;
      } catch (err) {
        toast.error(errorMessage(err));
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );
  return { busy, run };
}
