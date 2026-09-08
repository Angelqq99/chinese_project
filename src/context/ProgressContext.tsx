// src/context/ProgressContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface ProgressState {
  stars: Record<string, number>;
  seen: Record<string, boolean>;
}

interface ProgressContextValue extends ProgressState {
  effectiveStars: (id: string) => number;
  markSeen: (id: string) => void;
  setStars: (id: string, n: number) => void;
  reset: () => void;
  totalStars: number;
}

const KEY = 'cherta-progress-v1';

const load = (): ProgressState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { stars: p.stars ?? {}, seen: p.seen ?? {} };
    }
  } catch {
    // ignore corrupted data
  }
  return { stars: {}, seen: {} };
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export const ProgressProvider = ({ children }: { children: React.ReactNode }) => {
  const [progress, setProgress] = useState<ProgressState>(load);

  // Сохраняем в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      // quota exceeded etc.
    }
  }, [progress]);

  const effectiveStars = useCallback(
    (id: string) => Math.max(progress.stars[id] ?? 0, progress.seen[id] ? 1 : 0),
    [progress]
  );

  const markSeen = useCallback((id: string) => {
    setProgress((p) =>
      p.seen[id] ? p : { ...p, seen: { ...p.seen, [id]: true } }
    );
  }, []);

  const setStars = useCallback((id: string, n: number) => {
    setProgress((p) => ({
      ...p,
      stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, n) },
    }));
  }, []);

  const reset = useCallback(() => {
    setProgress({ stars: {}, seen: {} });
  }, []);

  const totalStars = Object.values(progress.stars).reduce((s, n) => s + n, 0) +
    Object.keys(progress.seen).filter((k) => !progress.stars[k]).length;

  const value: ProgressContextValue = {
    ...progress,
    effectiveStars,
    markSeen,
    setStars,
    reset,
    totalStars,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return ctx;
};