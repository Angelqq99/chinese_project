import React, { useEffect, useState } from 'react';
import { LEVELS, loadStrokesForPack } from './data/characters';
import type { Word } from './data/characters';
import type { Pt } from './lib/geometry';
import { useProgress } from './lib/useProgress';
import { HomeScreen } from './screens/HomeScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { IconSun, IconMoon } from './components/icons';

type Route =
  | { s: 'home' }
  | { s: 'practice'; li: number; pi: number; wi: number; ci: number; strokesMap: Map<string, Pt[][]> };

const THEME_KEY = 'cherta-theme';

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; }
  });
  const [route, setRoute] = useState<Route>({ s: 'home' });
  const { totalStars, reset } = useProgress();

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [dark]);

  const goHome = () => setRoute({ s: 'home' });

  const handleStart = async (li: number, pi: number) => {
    const pack = LEVELS[li].packs[pi];
    const strokesMap = await loadStrokesForPack(pack);
    setRoute({ s: 'practice', li, pi, wi: 0, ci: 0, strokesMap });
  };

  const handleNext = () => {
    if (route.s !== 'practice') return;
    const pack = LEVELS[route.li].packs[route.pi];
    const word = pack.words[route.wi];
    if (route.ci < word.chars.length - 1) {
      setRoute({ ...route, ci: route.ci + 1 });
    } else if (route.wi < pack.words.length - 1) {
      setRoute({ ...route, wi: route.wi + 1, ci: 0 });
    } else {
      goHome();
    }
  };

  const screen = (() => {
    switch (route.s) {
      case 'home':
        return <HomeScreen effectiveStars={totalStars} onReset={reset} onStart={handleStart} />;
      case 'practice': {
        const pack = LEVELS[route.li].packs[route.pi];
        const word = pack.words[route.wi];
        const char = word.chars[route.ci];
        const strokes = route.strokesMap.get(char);
        if (!strokes) {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-5">
              <p className="text-center text-[14px] text-ink-3 dark:text-bone-2">
                Нет данных о чертах для иероглифа «{char}»
              </p>
              <button onClick={goHome} className="rounded-md bg-seal px-4 py-2 text-[13px] font-bold text-paper dark:bg-ember dark:text-night">
                Назад
              </button>
            </div>
          );
        }
        return (
          <PracticeScreen
            char={char}
            pinyin={word.pinyin}
            en={word.en}
            ru={word.ru}
            strokes={strokes}
            posLabel={`${LEVELS[route.li].title} · ${pack.title} · ${route.wi + 1}/${pack.words.length}`}
            dark={dark}
            onNext={handleNext}
            onHome={goHome}
          />
        );
      }
    }
  })();

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="relative min-h-dvh overflow-hidden bg-paper font-body text-ink transition-colors duration-500 dark:bg-night dark:text-bone">
        <div className="paper-grain pointer-events-none absolute inset-0 z-0" />
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: dark
              ? 'radial-gradient(58% 44% at 12% 8%, rgba(226,74,48,0.07), transparent 70%), radial-gradient(70% 60% at 92% 96%, rgba(181,172,153,0.06), transparent 70%)'
              : 'radial-gradient(58% 44% at 12% 8%, rgba(199,58,43,0.06), transparent 70%), radial-gradient(70% 60% at 92% 96%, rgba(29,27,22,0.05), transparent 70%)',
          }}
        />

        <div className="relative z-10 mx-auto flex h-dvh w-full max-w-[432px] flex-col md:py-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-line bg-paper shadow-[0_24px_80px_-24px_rgba(29,27,22,0.45)] transition-colors duration-500 dark:bg-night dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] md:rounded-[26px] md:border md:border-line dark:md:border-mist">
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
              <button
                onClick={() => setDark((d) => !d)}
                aria-label="Переключить тему"
                className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink-2 transition-all duration-200 hover:bg-paper-2 hover:text-seal active:scale-90 dark:border-mist dark:text-bone-2 dark:hover:bg-night-3 dark:hover:text-ember"
              >
                {dark ? <IconSun size={17} /> : <IconMoon size={17} />}
              </button>
            </header>

            <main className="app-scroll min-h-0 flex-1 overflow-y-auto" key={JSON.stringify({ ...route, strokesMap: undefined })}>
              {screen}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
