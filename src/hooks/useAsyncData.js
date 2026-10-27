import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ambil data async dengan state loading / error / reload.
 * `loader` dipanggil ulang setiap `deps` berubah.
 */
export const useAsyncData = (loader, deps = [], { initialData = null, enabled = true } = {}) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  const requestId = useRef(0);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (id === requestId.current) setError(err.message || String(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  return { data, setData, loading, error, reload: run };
};
