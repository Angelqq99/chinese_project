import React, { useEffect, useState } from 'react';
import { LEVELS } from './data/characters';
import type { PracticeResult } from './lib/matcher';
import { useProgress } from './lib/useProgress';
import { HomeScreen } from './screens/HomeScreen';
import { MemorizeScreen } from './screens/MemorizeScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { IconSun, IconMoon, IconBack } from './components/icons';

type Route =
  | { s: 'home' }
  | { s: 'memorize'; li: number; pi: number; idx: number }
  | { s: 'practice'; li: number; pi: number; idx: number }
  | { s: 'result'; li: number; pi: number; idx: number; result: PracticeResult };

const THEME_KEY = 'cherta-theme';

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; }
  });
  const [route, setRoute] = useState<Route>({ s: 'home' });
  const { effectiveStars, markSeen, setStars, reset } = useProgress();

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [dark]);

  const goHome = () => setRoute({ s: 'home' });
  const packOf = (li: number, pi: number) => LEVELS[li].packs[pi];
  const posLabel = (li: number, pi: number, idx: number) =>
    `HSK ${LEVELS[li].hsk} · «${packOf(li, pi).title}» · ${idx +1} из ${packOf(li, pi).chars.length}`;

  const screen = (() => {
    switch (route.s) {
      case 'home':
        return <HomeScreen effectiveStars={effectiveStars} onReset={reset}
          onStart={(li, pi) => setRoute({ s: 'memorize', li, pi, idx: 0 })} />;
      case 'memorize': {
        const c = packOf(route.li, route.pi).chars[route.idx];
        return (
          <MemorizeScreen
            char={c}
            posLabel={posLabel(route.li, route.pi, route.idx)}
            onDone={(grant) => {
              if (grant) markSeen(c.id);
              setRoute({ s: 'practice', li: route.li, pi: route.pi, idx: route.idx });
            }}
          />
        );
      }
      case 'practice': {
        const c = packOf(route.li, route.pi).chars[route.idx];
        return (
          <PracticeScreen
            char={c}
            posLabel={posLabel(route.li, route.pi, route.idx)}
            dark={dark}
            onComplete={(result) => {
              setStars(c.id, result.stars);
              setRoute({ s: 'result', li: route.li, pi: route.pi, idx: route.idx, result });
            }}
          />
        );
      }
      case 'result': {
        const pack = packOf(route.li, route.pi);
        const c = pack.chars[route.idx];
        const isLast = route.idx >= pack.chars.length - 1;
        return (
          <ResultScreen
            char={c}
            posLabel={posLabel(route.li, route.pi, route.idx)}
            result={route.result}
            isLast={isLast}
            onHome={goHome}
            onRetry={() => setRoute({ s: 'practice', li: route.li, pi: route.pi, idx: route.idx })}
            onNext={() =>
              isLast
                ? goHome()
                : setRoute({ s: 'memorize', li: route.li, pi: route.pi, idx: route.idx + 1 })
            }
          />
        );
      }
    }
  })();

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="relative min-h-dvh overflow-hidden bg-paper font-body text-ink transition-colors duration-500 dark:bg-night dark:text-bone">
        {/* ---- амбиентный фон: тушь, бумага, водяной знак ---- */}
        <div className="paper-grain pointer-events-none absolute inset-0 z-0" />
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: dark
              ? 'radial-gradient(58% 44% at 12% 8%, rgba(226,74,48,0.07), transparent 70%), radial-gradient(70% 60% at 92% 96%, rgba(181,172,153,0.06), transparent 70%)'
              : 'radial-gradient(58% 44% at 12% 8%, rgba(199,58,43,0.06), transparent 70%), radial-gradient(70% 60% at 92% 96%, rgba(29,27,22,0.05), transparent 70%)',
          }}
        />
        <div className="anim-float pointer-events-none absolute -right-16 top-[16%] z-0 select-none font-brush text-[340px] leading-none text-ink/[0.045] dark:text-bone/[0.05]">
          永
        </div>
        <div className="pointer-events-none absolute -left-10 bottom-[6%] z-0 select-none font-brush text-[220px] leading-none text-seal/[0.05] dark:text-ember/[0.05]">
          墨
        </div>

        {/* ---- корпус приложения ---- */}
        <div className="relative z-10 mx-auto flex h-dvh w-full max-w-[432px] flex-col md:py-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-line bg-paper shadow-[0_24px_80px_-24px_rgba(29,27,22,0.45)] transition-colors duration-500 dark:bg-night dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] md:rounded-[26px] md:border md:border-line dark:md:border-mist">
            {/* шапка */}
            <header className="flex items-center justify-between border-b border-line px-4 py-2.5 dark:border-mist">
              <button onClick={goHome} className="group flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-sm bg-seal font-brush text-[17px] leading-none text-paper shadow-[2px_2px_0_rgba(29,27,22,0.25)] transition-transform duration-200 group-hover:-rotate-6 dark:bg-ember dark:text-night">
                  笔
                </span>
                <span className="text-left leading-none">
                  <span className="block font-display text-[17px] tracking-wide text-ink dark:text-bone">ЧЕРТА</span>
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-ink-3 dark:text-bone-2">
                    каллиграфия · HSK
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                {route.s !== 'home' && (
                  <button onClick={goHome} aria-label="Назад к уровням"
                    className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink-2 transition-all duration-150 hover:bg-paper-2 active:scale-90 dark:border-mist dark:text-bone-2 dark:hover:bg-night-3">
                    <IconBack size={17} />
                  </button>
                )}
                <button
                  onClick={() => setDark((d) => !d)}
                  aria-label="Переключить тему"
                  className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink-2 transition-all duration-200 hover:bg-paper-2 hover:text-seal active:scale-90 dark:border-mist dark:text-bone-2 dark:hover:bg-night-3 dark:hover:text-ember">
                  {dark ? <IconSun size={17} /> : <IconMoon size={17} />}
                </button>
              </div>
            </header>

            {/* экран */}
            <main className="app-scroll min-h-0 flex-1 overflow-y-auto" key={JSON.stringify({ ...route, result: undefined })}>
              {screen}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
