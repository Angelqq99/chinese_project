import React from 'react';
import type { Pt } from '../lib/geometry';
import { buildSmoothPath, pathLength, clamp } from '../lib/geometry';

interface Props {
  strokes: Pt[][];
  /** сколько черт уже нарисовано целиком */
  drawn?: number;
  /** анимировать черту с индексом drawn (красным) */
  animateCurrent?: boolean;
  /** длительность анимации текущей черты, мс */
  animDuration?: number;
  /** показать ненаписанные черты призраком */
  ghost?: boolean;
  /** сетка 米字格 */
  grid?: boolean;
  /** ключ перезапуска анимации */
  replayKey?: number;
  strokeWidth?: number;
  className?: string;
  inkClass?: string;
  activeClass?: string;
  ghostClass?: string;
  gridClass?: string;
}

/** Длительность анимации черты по её длине (для экрана запоминания). */
export const strokeDuration = (s: Pt[]) =>
  Math.round(clamp(pathLength(s) * 2400, 340, 940));

/**
 * Иероглиф как набор SVG-путей. Анимация «кисти» реализована через
 * stroke-dasharray/dashoffset (pathLength=100) — плавный аналог Lottie,
 * не требующий внешних файлов.
 */
export function StrokeGlyph({
  strokes, drawn = strokes.length, animateCurrent = false, animDuration = 700,
  ghost = false, grid = true, replayKey = 0, strokeWidth = 7,
  className = '', inkClass = 'text-ink dark:text-bone',
  activeClass = 'text-seal dark:text-ember',
  ghostClass = 'text-ink-3/35 dark:text-bone-2/25',
  gridClass = 'text-ink-3/30 dark:text-bone-2/15',
}: Props) {
  return (
    <svg viewBox="-5 -5 110 110" className={className} aria-hidden>
      {grid && (
        <g className={gridClass} stroke="currentColor" fill="none">
          <rect x="2" y="2" width="96" height="96" strokeWidth="2.2" />
          <g strokeWidth="1" strokeDasharray="4 5">
            <line x1="50" y1="2" x2="50" y2="98" />
            <line x1="2" y1="50" x2="98" y2="50" />
            <line x1="2" y1="2" x2="98" y2="98" />
            <line x1="98" y1="2" x2="2" y2="98" />
          </g>
        </g>
      )}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g key={replayKey}>
          {strokes.map((s, i) => {
            const d = buildSmoothPath(s);
            if (i < drawn) {
              return (
                <path key={i} d={d} className={inkClass} stroke="currentColor"
                  strokeWidth={strokeWidth} pathLength={100} />
              );
            }
            if (i === drawn && animateCurrent) {
              return (
                <path key={i} d={d} className={`${activeClass} stroke-draw`} stroke="currentColor"
                  strokeWidth={strokeWidth + 0.6} pathLength={100}
                  style={{ animationDuration: `${animDuration}ms` }} />
              );
            }
            if (ghost) {
              return (
                <path key={i} d={d} className={ghostClass} stroke="currentColor"
                  strokeWidth={strokeWidth - 1.5} strokeDasharray="2.5 7" pathLength={100} />
              );
            }
            return null;
          })}
        </g>
      </g>
    </svg>
  );
}

/** Мини-превью иероглифа тушью (для списков). */
export function BrushChar({ ch: char, className = '' }: { ch: string; className?: string }) {
  return <span className={`font-brush leading-none ${className}`}>{char}</span>;
}
