import React, { useState } from 'react';
import { LEVELS, levelWordCount, TOTAL_WORDS } from '../data/characters';
import { useProgress } from '../lib/useProgress';
import { StarRow, IconChevron, IconWifiOff, IconUndo } from '../components/icons';

interface Props {
  effectiveStars: number;
  onReset: () => void;
  onStart: (levelIdx: number, packIdx: number) => void;
}

export function HomeScreen({ effectiveStars, onReset, onStart }: Props) {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const { starsByChar } = useProgress();

  const totalStars = LEVELS.reduce(
    (sum, l) => sum + l.packs.reduce((s, p) => s + p.words.reduce((ss, w) => ss + w.chars.length * 3, 0), 0),
    0
  );

  const toggleLevel = (i: number) => setExpandedLevel(expandedLevel === i ? null : i);

  const levelStars = (li: number) => {
    const level = LEVELS[li];
    let earned = 0;
    level.packs.forEach((p) => {
      p.words.forEach((w) => {
        w.chars.forEach((ch) => {
          earned += starsByChar[ch] || 0;
        });
      });
    });
    return earned;
  };

  const levelMaxStars = (li: number) => {
    const level = LEVELS[li];
    return level.packs.reduce((s, p) => s + p.words.reduce((ss, w) => ss + w.chars.length * 3, 0), 0);
  };

  return (
    <div className="flex h-full flex-col px-5 pb-6">
      {/* шапка с общей статистикой */}
      <div className="anim-fade-up pt-2">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-[26px] leading-none tracking-wide text-ink dark:text-bone">
            Уровни HSK
          </h1>
          <span className="text-[11px] font-semibold text-ink-3 dark:text-bone-2">
            {TOTAL_WORDS} слов
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-ink-3 dark:text-bone-2">
              <span>Прогресс</span>
              <span>{effectiveStars} / {totalStars} ★</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-3 dark:bg-night-3">
              <div
                className="anim-bar h-full rounded-full bg-gradient-to-r from-seal to-seal-2 dark:from-ember dark:to-seal-2"
                style={{ width: `${totalStars ? (effectiveStars / totalStars) * 100 : 0}%` }}
              />
            </div>
          </div>
          <button
            onClick={onReset}
            title="Сбросить прогресс"
            className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink-3 transition hover:bg-paper-2 hover:text-seal active:scale-90 dark:border-mist dark:text-bone-2 dark:hover:bg-night-3 dark:hover:text-ember"
          >
            <IconUndo size={16} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-3 dark:text-bone-2">
          <IconWifiOff size={11} />
          <span>Офлайн-режим · данные кэшируются</span>
        </div>
      </div>

      {/* список уровней */}
      <div className="mt-4 flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {LEVELS.map((level, li) => {
          const expanded = expandedLevel === li;
          const earned = levelStars(li);
          const max = levelMaxStars(li);
          const pct = max ? (earned / max) * 100 : 0;
          return (
            <div key={li} className="anim-fade-up" style={{ animationDelay: `${li * 0.06}s` }}>
              <button
                onClick={() => toggleLevel(li)}
                className="group w-full rounded-lg border border-line bg-paper-2/70 px-4 py-3 text-left transition-all duration-200 hover:border-seal/30 hover:bg-paper-2 active:scale-[0.995] dark:border-mist dark:bg-night-2/60 dark:hover:border-ember/30 dark:hover:bg-night-2"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-seal font-brush text-[22px] leading-none text-paper shadow-sm transition-transform duration-200 group-hover:-rotate-3 dark:bg-ember dark:text-night">
                    {level.hsk}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-display text-[15px] text-ink dark:text-bone">
                        HSK {level.hsk} · {level.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-ink-3 dark:text-bone-2">
                        {levelWordCount(level)} слов
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-3 dark:bg-night-3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-seal/80 to-seal-2/80 transition-all duration-500 dark:from-ember/80 dark:to-seal-2/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-ink-3 dark:text-bone-2">
                      <span>{earned} / {max} ★</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <IconChevron
                    size={16}
                    className={`shrink-0 text-ink-3 transition-transform duration-200 dark:text-bone-2 ${expanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </button>

              {/* раскрытые пачки */}
              {expanded && (
                <div className="mt-1.5 space-y-1 pl-2">
                  {level.packs.map((pack, pi) => {
                    const packEarned = pack.words.reduce((s, w) => s + w.chars.reduce((ss, ch) => ss + (starsByChar[ch] || 0), 0), 0);
                    const packMax = pack.words.reduce((s, w) => s + w.chars.length * 3, 0);
                    return (
                      <button
                        key={pack.id}
                        onClick={() => onStart(li, pi)}
                        className="group flex w-full items-center gap-3 rounded-md border border-transparent bg-paper/60 px-3 py-2.5 text-left transition-all hover:border-seal/20 hover:bg-paper-2 active:scale-[0.99] dark:border-transparent dark:bg-night-3/40 dark:hover:border-ember/20 dark:hover:bg-night-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink dark:text-bone">
                              {pack.title}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-ink-3 dark:text-bone-2">
                              {pack.words.length} слов
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-ink-3 dark:text-bone-2">
                            {pack.subtitle}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-3 dark:bg-night-3">
                              <div
                                className="h-full rounded-full bg-seal/60 transition-all duration-300 dark:bg-ember/60"
                                style={{ width: `${packMax ? (packEarned / packMax) * 100 : 0}%` }}
                              />
                            </div>
                            <StarRow n={packMax ? Math.round((packEarned / packMax) * 3) : 0} size={10} />
                          </div>
                        </div>
                        <IconChevron size={14} className="shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 dark:text-bone-2" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
