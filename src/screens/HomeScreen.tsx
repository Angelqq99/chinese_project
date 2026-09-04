import React, { useEffect, useMemo, useState } from 'react';
import { LEVELS, TOTAL_CHARS, TOTAL_STARS, levelCharCount, ALL_CHARS } from '../data/characters';
import { StrokeGlyph, strokeDuration } from '../components/StrokeGlyph';
import { IconChevron, IconWifiOff, IconStar, IconBrush } from '../components/icons';

interface Props {
  effectiveStars: (id: string) => number;
  onStart: (levelIdx: number, packIdx: number) => void;
  onReset: () => void;
}

const YONG = ALL_CHARS.find((c) => c.ch === '永')!;

export function HomeScreen({ effectiveStars, onStart, onReset }: Props) {
  const [open, setOpen] = useState<number>(0);
  const [armed, setArmed] = useState(false);
  const [brandDrawn, setBrandDrawn] = useState(0);

  /* «живой» логотип: 永 пишется сам, черта за чертой */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const n = YONG.strokes.length;
    const tick = () => {
      setBrandDrawn((d) => {
        const next = d >= n ? 0 : d + 1;
        const dur = next === 0 ? 1400 : strokeDuration(YONG.strokes[next - 1]) + 140;
        t = setTimeout(tick, dur);
        return next;
      });
    };
    t = setTimeout(tick, 500);
    return () => clearTimeout(t);
  }, []);

  const earned = useMemo(
    () => ALL_CHARS.reduce((s, c) => s + effectiveStars(c.id), 0),
    [effectiveStars],
  );
  const pct = Math.round((earned / TOTAL_STARS) * 100);
  const R = 30;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="px-5 pb-10 pt-2">
      {/* ---- шапка-бренд ---- */}
      <header className="anim-fade-up flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-[104px] w-[104px] overflow-hidden rounded-md border-2 border-ink/80 bg-paper shadow-[4px_4px_0_rgba(199,58,43,0.85)] dark:border-bone/70 dark:bg-night-2">
            <StrokeGlyph
              strokes={YONG.strokes}
              drawn={brandDrawn}
              animateCurrent
              animDuration={brandDrawn > 0 ? strokeDuration(YONG.strokes[brandDrawn - 1]) : 400}
              replayKey={brandDrawn === 0 ? Date.now() : brandDrawn}
              strokeWidth={8}
              className="h-full w-full p-1.5"
            />
          </div>
          <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-sm bg-seal font-brush text-[15px] text-paper shadow-sm">
            笔
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-display text-[34px] leading-none tracking-wide text-ink dark:text-bone">
            ЧЕРТА
          </div>
          <div className="mt-1 font-brush text-xl leading-none text-seal dark:text-ember">笔画 · bǐhuà</div>
          <p className="mt-2 text-[13px] font-medium leading-snug text-ink-2 dark:text-bone-2">
            Тренажёр каллиграфии: порядок черт, направление, пропорции — по системе HSK.
          </p>
        </div>
      </header>

      {/* ---- сводка прогресса ---- */}
      <section className="anim-fade-up mt-6 flex items-center gap-4 rounded-lg border border-line bg-paper-2/70 px-4 py-3.5 dark:border-mist dark:bg-night-2"
        style={{ animationDelay: '0.06s' }}>
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={R} fill="none" strokeWidth="7" className="stroke-line dark:stroke-mist" />
            <circle cx="38" cy="38" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
              className="stroke-seal dark:stroke-ember transition-all duration-700"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)} />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-xl text-ink dark:text-bone">{pct}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl text-ink dark:text-bone">{earned}</span>
            <span className="text-[12px] font-semibold text-ink-3 dark:text-bone-2">/ {TOTAL_STARS} ★</span>
          </div>
          <p className="mt-0.5 text-[12px] font-medium text-ink-2 dark:text-bone-2">
            {TOTAL_CHARS} иероглифов в словаре · 9 тематических пачек
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ink-3 dark:border-mist dark:text-bone-2">
            <IconWifiOff size={13} /> ОФЛАЙН-СЛОВАРЬ КЭШИРОВАН
          </span>
        </div>
      </section>

      {/* ---- как устроено ---- */}
      <section className="anim-fade-up mt-5 flex items-center gap-2 text-[11.5px] font-semibold text-ink-2 dark:text-bone-2"
        style={{ animationDelay: '0.1s' }}>
        <span className="inline-flex items-center gap-1"><IconBrush size={14} className="text-seal dark:text-ember" /> смотри анимацию</span>
        <span className="text-ink-3">→</span>
        <span>пиши по памяти</span>
        <span className="text-ink-3">→</span>
        <span className="inline-flex items-center gap-1 text-seal dark:text-ember"><IconStar size={13} filled /> собирай звёзды</span>
      </section>

      {/* ---- уровни HSK ---- */}
      <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-3 dark:text-bone-2">
        Уровни HSK
      </h2>
      <div className="mt-2.5 space-y-2">
        {LEVELS.map((lvl, li) => {
          const chars = lvl.packs.flatMap((p) => p.chars);
          const max = chars.length * 3;
          const got = chars.reduce((s, c) => s + effectiveStars(c.id), 0);
          const active = open === li;
          return (
            <div key={lvl.hsk}
              className={`anim-fade-up overflow-hidden rounded-lg border transition-colors duration-300 ${active
                ? 'border-seal/50 bg-paper-2 shadow-[3px_3px_0_rgba(29,27,22,0.08)] dark:bg-night-2 dark:border-ember/40'
                : 'border-line bg-transparent hover:bg-paper-2/60 dark:border-mist dark:hover:bg-night-2/60'}`}
              style={{ animationDelay: `${0.12 + li * 0.05}s` }}>
              <button
                onClick={() => setOpen(active ? -1 : li)}
                className="flex w-full items-center gap-3.5 px-4 py-3 text-left">
                <span className={`font-display text-[42px] leading-none ${active ? 'text-seal dark:text-ember' : 'text-ink dark:text-bone'}`}>
                  {lvl.hsk}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-3 dark:text-bone-2">
                    HSK {lvl.hsk}
                  </span>
                  <span className="block truncate font-display text-lg leading-tight text-ink dark:text-bone">
                    {lvl.title}
                  </span>
                  <span className="mt-1.5 block h-[5px] w-full max-w-[190px] overflow-hidden rounded-full bg-line/80 dark:bg-mist">
                    <span className="anim-bar block h-full rounded-full bg-seal dark:bg-ember"
                      style={{ width: `${max ? (got / max) * 100 : 0}%` }} />
                  </span>
                </span>
                <span className="text-right">
                  <span className="flex items-center justify-end gap-1 text-[13px] font-bold text-ink dark:text-bone">
                    <IconStar size={13} filled className="text-seal dark:text-ember" />{got}
                    <span className="font-semibold text-ink-3 dark:text-bone-2">/ {max}</span>
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-ink-3 dark:text-bone-2">
                    {levelCharCount(lvl)} иерогл.
                  </span>
                </span>
                <IconChevron size={16} className={`shrink-0 text-ink-3 transition-transform duration-300 dark:text-bone-2 ${active ? 'rotate-90' : ''}`} />
              </button>

              {active && (
                <div className="anim-fade-up border-t border-line/70 px-3 py-2.5 dark:border-mist/70">
                  <ul className="space-y-1.5">
                    {lvl.packs.map((pack, pi) => {
                      const pMax = pack.chars.length * 3;
                      const pGot = pack.chars.reduce((s, c) => s + effectiveStars(c.id), 0);
                      return (
                        <li key={pack.id}>
                          <button
                            onClick={() => onStart(li, pi)}
                            className="group flex w-full items-center gap-3 rounded-md border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-seal/40 hover:bg-paper active:scale-[0.985] dark:hover:border-ember/40 dark:hover:bg-night-3">
                            <span className="flex -space-x-2.5">
                              {pack.chars.slice(0, 4).map((c) => (
                                <span key={c.id}
                                  className="grid h-9 w-9 place-items-center rounded-md border border-line bg-paper font-brush text-[19px] text-ink shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 dark:border-mist dark:bg-night dark:text-bone">
                                  {c.ch}
                                </span>
                              ))}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-bold text-ink dark:text-bone">{pack.title}</span>
                              <span className="block truncate text-[11.5px] text-ink-3 dark:text-bone-2">
                                {pack.subtitle} · {pack.chars.length} иерогл.
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-[12px] font-bold text-ink-2 dark:text-bone-2">
                              <IconStar size={12} filled className="text-seal dark:text-ember" />{pGot}
                              <span className="text-ink-3 dark:text-bone-2">/{pMax}</span>
                            </span>
                            <IconChevron size={15} className="text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-bone-2" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    onClick={() => {
                      const firstOpen = lvl.packs.findIndex((p) =>
                        p.chars.some((c) => effectiveStars(c.id) < 3));
                      onStart(li, firstOpen === -1 ? 0 : firstOpen);
                    }}
                    className="anim-ring mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-seal py-3 font-display text-[17px] tracking-wide text-paper transition-transform duration-150 hover:bg-seal-2 active:scale-[0.98] dark:bg-ember dark:text-night dark:hover:bg-seal">
                    Начать тренировку
                    <IconChevron size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- правило звёзд ---- */}
      <section className="anim-fade-up mt-6 rounded-lg border border-dashed border-line px-4 py-3 dark:border-mist" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2 dark:text-bone-2">
          <span className="text-seal dark:text-ember"><IconStar size={14} filled /></span> узнал иероглиф
          <span className="text-ink-3">·</span>
          <span className="text-seal dark:text-ember"><IconStar size={14} filled /><IconStar size={14} filled className="-ml-2.5" /></span> верный порядок черт
          <span className="text-ink-3">·</span>
          <span className="inline-flex text-seal dark:text-ember">
            <IconStar size={14} filled /><IconStar size={14} filled className="-ml-2.5" /><IconStar size={14} filled className="-ml-2.5" />
          </span> идеальный контур
        </div>
      </section>

      <button
        onClick={() => { if (armed) { onReset(); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 2500); } }}
        className={`mt-6 text-[11.5px] font-semibold underline decoration-dotted underline-offset-4 transition-colors ${armed ? 'text-seal dark:text-ember' : 'text-ink-3 dark:text-bone-2'}`}>
        {armed ? 'Точно сбросить? Нажмите ещё раз' : 'Сбросить прогресс'}
      </button>
    </div>
  );
}
