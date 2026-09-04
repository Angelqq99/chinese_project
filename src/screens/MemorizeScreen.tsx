import React, { useEffect, useState } from 'react';
import type { CharDef } from '../data/characters';
import { StrokeGlyph, strokeDuration } from '../components/StrokeGlyph';
import { inferStrokeName } from '../lib/geometry';
import { IconReplay, IconChevron, IconEye } from '../components/icons';

interface Props {
  char: CharDef;
  posLabel: string;          // «Пачка „Природа“ · 3 из 8»
  onDone: (grantRecognition: boolean) => void;
}

type Phase = 'draw' | 'hold' | 'gone';

export function MemorizeScreen({ char, posLabel, onDone }: Props) {
  const n = char.strokes.length;
  const [phase, setPhase] = useState<Phase>('draw');
  const [drawn, setDrawn] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  /* таймлайн анимации: черта за чертой */
  useEffect(() => {
    if (phase !== 'draw') return;
    if (drawn >= n) { setPhase('hold'); return; }
    const delay = drawn === 0 ? 650 : strokeDuration(char.strokes[drawn - 1]) + 130;
    const t = setTimeout(() => setDrawn((d) => d + 1), delay);
    return () => clearTimeout(t);
  }, [phase, drawn, n, char, replayKey]);

  /* 3 секунды на запоминание — и иероглиф исчезает */
  useEffect(() => {
    if (phase !== 'hold') return;
    const t = setTimeout(() => setPhase('gone'), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'gone') return;
    const t = setTimeout(() => onDone(true), 950);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const replay = () => { setDrawn(0); setPhase('draw'); setReplayKey((k) => k + 1); };

  const curIdx = Math.max(0, Math.min(drawn, n) - 1);
  const curName = inferStrokeName(char.strokes[curIdx]);

  return (
    <div className="flex h-full flex-col px-5 pb-6">
      {/* контекст */}
      <div className="anim-fade-up flex items-center justify-between gap-2 pt-1">
        <span className="truncate text-[12px] font-semibold text-ink-2 dark:text-bone-2">{posLabel}</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-ink-2 dark:border-mist dark:text-bone-2">
          <IconEye size={13} className="text-seal dark:text-ember" /> ЗАПОМИНАНИЕ
        </span>
      </div>

      {/* холст с анимацией */}
      <div className="relative mx-auto mt-3 w-full max-w-[330px] flex-1 min-h-0">
        <div className={`mx-auto aspect-square w-full transition-all duration-700 ${phase === 'gone' ? 'scale-95 opacity-0' : 'opacity-100'}`}>
          <StrokeGlyph
            strokes={char.strokes}
            drawn={drawn}
            animateCurrent={phase === 'draw'}
            animDuration={drawn < n ? strokeDuration(char.strokes[Math.min(drawn, n - 1)]) : 500}
            replayKey={replayKey * 100 + drawn}
            strokeWidth={7.4}
            className="h-full w-full"
          />
        </div>

        {/* обратный отсчёт исчезновения */}
        {phase === 'hold' && (
          <div className="anim-fade-in absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-2 rounded-lg bg-paper/85 px-5 py-3 shadow-sm backdrop-blur-[2px] dark:bg-night/85">
              <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
                <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4.5" className="stroke-line dark:stroke-mist" />
                <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4.5" strokeLinecap="round"
                  pathLength={100} strokeDasharray="100"
                  className="stroke-seal dark:stroke-ember stroke-draw"
                  style={{ animationDuration: '3s', animationTimingFunction: 'linear' }} />
              </svg>
              <span className="text-[11.5px] font-bold text-ink dark:text-bone">Запомни — исчезнет через 3 с</span>
            </div>
          </div>
        )}

        {phase === 'gone' && (
          <div className="anim-fade-up absolute inset-0 grid place-items-center">
            <p className="max-w-[220px] text-center text-[13px] font-semibold text-ink-3 dark:text-bone-2">
              Иероглиф скрыт. Вспомни порядок черт — переходим к письму…
            </p>
          </div>
        )}
      </div>

      {/* карточка слова */}
      <div className="anim-fade-up mt-2 text-center" style={{ animationDelay: '0.08s' }}>
        {phase === 'draw' && (
          <div key={curIdx} className="anim-fade-in mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-[12px] font-bold text-paper dark:bg-bone dark:text-night">
            Черта {Math.min(drawn + 1, n)} из {n}
            <span className="font-brush text-[15px] text-ember dark:text-seal">{curName.zh}</span>
            {curName.py} · {curName.ru}
          </div>
        )}
        <div className="font-display text-[44px] leading-none text-ink dark:text-bone">
          {char.pinyin}
        </div>
        <div className="mt-1.5 text-[15px] font-bold text-seal dark:text-ember">{char.en}</div>
        <div className="text-[12.5px] font-medium text-ink-3 dark:text-bone-2">{char.ru} · {n} черт{phase === 'draw' ? ' · красная — текущая' : ''}</div>
      </div>

      {/* управление одной рукой */}
      <div className="mt-4 flex gap-2.5">
        <button
          onClick={replay}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border-[1.5px] border-ink/70 py-3 text-[14px] font-bold text-ink transition-all duration-150 hover:bg-paper-2 active:scale-[0.97] dark:border-bone/60 dark:text-bone dark:hover:bg-night-3">
          <IconReplay size={17} /> Ещё раз
        </button>
        <button
          onClick={() => onDone(phase !== 'draw' || drawn >= n)}
          className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-md bg-ink py-3 font-display text-[16px] tracking-wide text-paper transition-all duration-150 hover:bg-ink-2 active:scale-[0.97] dark:bg-bone dark:text-night dark:hover:bg-bone-2">
          К практике <IconChevron size={16} />
        </button>
      </div>
    </div>
  );
}
