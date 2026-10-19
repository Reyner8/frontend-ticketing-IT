import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError, PaginationMeta } from './client';
import { PAGINATION } from '../constants';

export interface PaginatedListParams {
  page: number;
  perPage: number;
}

export interface PaginatedListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Paginasi server-side: fetcher dipanggil ulang setiap page/perPage/filter berubah,
 * dan otomatis reset ke halaman 1 saat deps (filter) berubah.
 * Set `enabled = false` untuk menunda/menonaktifkan fetch (mis. halaman memakai jalur client-side).
 */
export function usePaginatedList<T>(
  fetcher: (params: PaginatedListParams) => Promise<PaginatedListResult<T>>,
  deps: unknown[] = [],
  enabled = true
) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState<number>(PAGINATION.defaultPageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const depsKey = JSON.stringify(deps);
  const prevDepsKey = useRef(depsKey);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (prevDepsKey.current !== depsKey) {
      prevDepsKey.current = depsKey;
      if (page !== 1) {
        setPageState(1);
        return;
      }
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher({ page, perPage });
        if (cancelled) return;
        setItems(result.data);
        setMeta(result.meta);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // fetcher sengaja tidak masuk deps — pola sama dengan useAsyncData di atas
  }, [page, perPage, depsKey, reloadKey, enabled]);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPerPage = useCallback((n: number) => {
    setPerPageState(n);
    setPageState(1);
  }, []);

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return { items, meta, page, perPage, loading, error, setPage, setPerPage, refetch, setItems };
}

/** Tunda nilai (mis. input search) sebelum dipakai sebagai query server-side. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
