import { useCallback, useEffect, useState } from 'react';

/**
 * Прогресс хранится локально (офлайн-режим):
 *  stars — максимум звёзд за начертание (0..3);
 *  seen  — иероглиф узнан (просмотрена анимация) → минимум ★.
 */
export interface ProgressState {
  stars: Record<string, number>;
  seen: Record<string, boolean>;
}

const KEY = 'cherta-progress-v1';

const load = (): ProgressState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as ProgressState;
      return { stars: p.stars ?? {}, seen: p.seen ?? {} };
    }
  } catch { /* повреждённые данные игнорируем */ }
  return { stars: {}, seen: {} };
};

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* quota */ }
  }, [progress]);

  const effectiveStars = useCallback(
    (id: string) => Math.max(progress.stars[id] ?? 0, progress.seen[id] ? 1 : 0),
    [progress],
  );

  const markSeen = useCallback((id: string) => {
    setProgress((p) => (p.seen[id] ? p : { ...p, seen: { ...p.seen, [id]: true } }));
  }, []);

  const setStars = useCallback((id: string, n: number) => {
    setProgress((p) => ({
      ...p,
      stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, n) },
    }));
  }, []);

  const reset = useCallback(() => setProgress({ stars: {}, seen: {} }), []);

  const totalStars = Object.values(progress.stars).reduce((s, n) => s + n, 0) +
    Object.keys(progress.seen).filter((k) => !progress.stars[k]).length;

  return { progress, starsByChar: progress.stars, effectiveStars, markSeen, setStars, reset, totalStars };
}
