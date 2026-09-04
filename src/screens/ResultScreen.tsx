import React, { useEffect, useRef, useState } from 'react';
import type { CharDef } from '../data/characters';
import type { PracticeResult } from '../lib/matcher';
import { StrokeGlyph } from '../components/StrokeGlyph';
import { StarRow, IconSpeaker, IconChevron, IconReplay } from '../components/icons';
import { clamp01 } from '../lib/geometry';

interface Props {
  char: CharDef;
  posLabel: string;
  result: PracticeResult;
  isLast: boolean;
  onNext: () => void;
  onRetry: () => void;
  onHome: () => void;
}

const SEAL: Record<number, { glyph: string; word: string }> = {
  3: { glyph: '妙', word: 'великолепно' },
  2: { glyph: '好', word: 'хорошо' },
  1: { glyph: '过', word: 'зачтено' },
};

export function ResultScreen({ char, posLabel, result, isLast, onNext, onRetry, onHome }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const warm = () => window.speechSynthesis.getVoices();
      warm();
      window.speechSynthesis.addEventListener?.('voiceschanged', warm);
      return () => {
        window.speechSynthesis.removeEventListener?.('voiceschanged', warm);
        window.speechSynthesis.cancel();
      };
    }
  }, []);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(char.example.zh);
    u.lang = 'zh-CN';
    u.rate = 0.78;
    const zh = window.speechSynthesis.getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('zh'));
    if (zh) u.voice = zh;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    setSpeaking(true);
    window.speechSynthesis.speak(u);
    timerRef.current = setTimeout(() => setSpeaking(false), 9000);
  };

  const orderPct = Math.round(clamp01(1 - result.orderErrors / char.strokes.length) * 100);
  const shapePct = Math.round(result.shapeAvg * 100);
  const seal = SEAL[result.stars];

  const tip =
    result.stars === 1
      ? 'Для ★★ — напишите все черты по порядку, без ошибок порядка.'
      : result.stars === 2
        ? 'Для ★★★ — точность формы ≥ 68 % и ни одной подсказки.'
        : 'Идеальное начертание: порядок, направление и пропорции — безупречны.';

  const bars = [
    { label: 'Порядок черт', val: orderPct, note: result.orderErrors ? `${result.orderErrors} ошибк.` : 'без ошибок' },
    { label: 'Точность формы', val: shapePct, note: `допуск ±10 %` },
  ];

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="truncate text-[12px] font-semibold text-ink-2 dark:text-bone-2">{posLabel}</span>
        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-ink-2 dark:border-mist dark:text-bone-2">
          КОНТЕКСТ
        </span>
      </div>

      {isLast && (
        <div className="anim-pop mt-3 flex items-center justify-between rounded-md bg-ink px-4 py-2.5 text-paper dark:bg-bone dark:text-night">
          <span className="font-display text-[17px] tracking-wide">Пачка пройдена!</span>
          <span className="font-brush text-2xl text-ember dark:text-seal">完成</span>
        </div>
      )}

      {/* иероглиф + печать */}
      <div className="anim-fade-up mt-3 flex items-center gap-5">
        <div className="relative w-[132px] shrink-0">
          <StrokeGlyph strokes={char.strokes} strokeWidth={7.6} className="w-full" />
          <div className="anim-stamp absolute -bottom-1 -right-2 grid h-12 w-12 place-items-center rounded-sm border-2 border-seal bg-seal/8 font-brush text-[27px] leading-none text-seal dark:border-ember dark:text-ember">
            {seal.glyph}
          </div>
        </div>
        <div className="min-w-0">
          <StarRow n={result.stars} animate size={30} />
          <div className="mt-1.5 font-display text-[26px] leading-none text-ink dark:text-bone">
            {char.pinyin}
          </div>
          <div className="mt-1 text-[13.5px] font-bold text-seal dark:text-ember">
            {char.en} <span className="font-medium text-ink-3 dark:text-bone-2">· {char.ru}</span>
          </div>
          <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-ink-3 dark:text-bone-2">{tip}</p>
        </div>
      </div>

      {/* разбор */}
      <div className="anim-fade-up mt-4 space-y-2.5" style={{ animationDelay: '0.12s' }}>
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-baseline justify-between text-[12px] font-bold">
              <span className="text-ink dark:text-bone">{b.label}</span>
              <span className="text-ink-3 dark:text-bone-2">
                <span className="font-display text-[16px] text-seal dark:text-ember">{b.val}%</span> · {b.note}
              </span>
            </div>
            <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-line/70 dark:bg-mist">
              <div className="anim-bar h-full rounded-full bg-seal dark:bg-ember" style={{ width: `${Math.max(4, b.val)}%` }} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-0.5 text-[11.5px] font-semibold text-ink-3 dark:text-bone-2">
          Подсказки:
          <span className={`rounded-full px-2 py-0.5 font-extrabold ${result.hintsUsed + result.autoHints === 0 ? 'bg-seal/12 text-seal dark:bg-ember/15 dark:text-ember' : 'bg-line/60 text-ink-2 dark:bg-mist dark:text-bone-2'}`}>
            {result.hintsUsed + result.autoHints === 0 ? 'не понадобились' : result.hintsUsed + result.autoHints}
          </span>
        </div>
      </div>

      {/* предложение */}
      <div className="anim-fade-up mt-4 flex-1 rounded-lg border border-line bg-paper-2/70 p-4 dark:border-mist dark:bg-night-2" style={{ animationDelay: '0.18s' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-ink-3 dark:text-bone-2">
            Предложение · HSK
          </span>
          <button onClick={speak} aria-label="Озвучить"
            className={`grid h-10 w-10 place-items-center rounded-full transition-all duration-200 active:scale-90 ${speaking
              ? 'anim-ring bg-seal text-paper dark:bg-ember dark:text-night'
              : 'border-[1.5px] border-seal/70 text-seal hover:bg-seal/10 dark:border-ember/70 dark:text-ember dark:hover:bg-ember/10'}`}>
            {speaking ? (
              <span className="flex h-4 items-end gap-[2.5px]">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="w-[3px] rounded-sm bg-current"
                    style={{ height: '100%', animation: `speak-wave .8s ease-in-out ${i * 0.12}s infinite` }} />
                ))}
              </span>
            ) : <IconSpeaker size={18} />}
          </button>
        </div>
        <p className="mt-2 font-song text-[26px] font-semibold leading-snug text-ink dark:text-bone">
          {char.example.zh}
        </p>
        <p className="mt-1 text-[13.5px] font-bold text-seal dark:text-ember">{char.example.py}</p>
        <p className="mt-0.5 text-[13px] font-medium text-ink-2 dark:text-bone-2">{char.example.en}</p>
      </div>

      {/* навигация */}
      <div className="mt-4 flex gap-2.5">
        <button onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-[1.5px] border-ink/70 py-3 text-[13.5px] font-bold text-ink transition-all duration-150 hover:bg-paper-2 active:scale-[0.97] dark:border-bone/60 dark:text-bone dark:hover:bg-night-3">
          <IconReplay size={16} /> Ещё раз
        </button>
        <button onClick={onNext}
          className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-md bg-seal py-3 font-display text-[16px] tracking-wide text-paper transition-all duration-150 hover:bg-seal-2 active:scale-[0.97] dark:bg-ember dark:text-night dark:hover:bg-seal">
          {isLast ? 'К уровням' : 'Следующий'} <IconChevron size={16} />
        </button>
      </div>
      <button onClick={onHome} className="mx-auto mt-2.5 text-[12px] font-semibold text-ink-3 underline decoration-dotted underline-offset-4 dark:text-bone-2">
        выйти к уровням HSK
      </button>
    </div>
  );
}
