import { useSearchParams } from 'react-router-dom';

/** Tab aktif disimpan di URL (?tab=...) supaya bisa dibagikan & tidak hilang saat reload. */
export const useTabParam = (tabs, fallback) => {
  const [params, setParams] = useSearchParams();
  const keys = tabs.map((t) => t.key);
  const raw = params.get('tab');
  const active = keys.includes(raw) ? raw : fallback || keys[0];
  const setActive = (key) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };
  return [active, setActive];
};
