import React, { useEffect, useRef, useState } from 'react';
import type { CharDef } from '../data/characters';
import type { Pt } from '../lib/geometry';
import {
  drawSmooth, drawPartial, simplify, dist, angleOf, angleDiffDeg,
  expectedDirectionAt, arcProgress, inferStrokeName, clamp01,
} from '../lib/geometry';
import { matchStroke, buildResult, type PracticeResult } from '../lib/matcher';
import { IconUndo, IconTrash, IconBulb, IconCheck } from '../components/icons';

interface Props {
  char: CharDef;
  posLabel: string;
  dark: boolean;
  onComplete: (r: PracticeResult) => void;
}

interface Sim {
  accepted: Pt[][];
  scores: number[];
  expected: number;
  live: Pt[] | null;
  flash: { pts: Pt[]; t0: number }[];
  ghost: { pts: Pt[]; t0: number } | null;
  arrow: { x: number; y: number; angle: number; mode: 'dir' | 'start' } | null;
  fails: number;
  orderErrors: number;
  hints: number;
  autoHints: number;
  done: boolean;
}

const COLORS = {
  light: { grid: '#d5cfba', gridSoft: '#e0dbca', ink: '#1d1b16', bad: '#c73a2b', ghost: '#c73a2b', ghostDim: '#8b8474', start: '#8b8474' },
  dark: { grid: '#38342a', gridSoft: '#2a2721', ink: '#ece5d4', bad: '#e24a30', ghost: '#e24a30', ghostDim: '#8f887a', start: '#8f887a' },
};

export function PracticeScreen({ char, posLabel, dark, onComplete }: Props) {
  const strokes = char.strokes;
  const n = strokes.length;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>({
    accepted: [], scores: [], expected: 0, live: null, flash: [], ghost: null,
    arrow: null, fails: 0, orderErrors: 0, hints: 0, autoHints: 0, done: false,
  });
  const darkRef = useRef(dark);
  darkRef.current = dark;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [ui, setUi] = useState({ count: 0, expected: 0, done: false });
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const say = (msg: string) => {
    setToast({ id: Date.now(), msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };
  const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* нет вибро */ } };

  const syncUi = () => {
    const s = sim.current;
    setUi({ count: s.accepted.length, expected: s.expected, done: s.done });
  };

  /* ---------- автоматический призрак после двух промахов ---------- */
  const autoGhost = () => {
    const s = sim.current;
    s.ghost = { pts: strokes[s.expected], t0: performance.now() };
    s.autoHints++;
  };

  /* ---------- события указателя ---------- */
  const toPt = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    const s = sim.current;
    if (s.done) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toPt(e);
    s.live = [p];
    s.arrow = null;
    // если начали далеко от ожидаемого старта — пульсирующая метка
    const ref0 = strokes[s.expected][0];
    if (dist(p, ref0) > 0.30) {
      s.arrow = { x: ref0.x, y: ref0.y, angle: angleOf(p, ref0), mode: 'start' };
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const s = sim.current;
    if (!s.live || s.done) return;
    const p = toPt(e);
    const lp = s.live[s.live.length - 1];
    if (dist(p, lp) < 0.006) return;
    s.live.push(p);

    // мгновенная проверка направления против эталона
    if (s.live.length >= 4 && s.arrow?.mode !== 'start') {
      const ref = strokes[s.expected];
      const a = s.live;
      const userDir = angleOf(a[a.length - 4], p);
      const expDir = expectedDirectionAt(ref, arcProgress(a, ref));
      if (angleDiffDeg(userDir, expDir) > 62) {
        s.arrow = { x: p.x, y: p.y, angle: expDir, mode: 'dir' };
      } else if (s.arrow?.mode === 'dir') {
        s.arrow = null;
      }
    }
  };

  const onUp = () => {
    const s = sim.current;
    if (!s.live || s.done) return;
    const raw = s.live;
    s.live = null;
    const user = simplify(raw, 0.008);
    if (user.length < 2) { s.arrow = null; return; }

    const verdict = matchStroke(user, strokes, s.expected);

    if (verdict.kind === 'tiny') { s.arrow = null; return; }

    if (verdict.kind === 'accepted' || verdict.kind === 'perfect') {
      s.accepted.push(user);
      s.scores.push(verdict.shape);
      s.expected++;
      s.fails = 0;
      s.arrow = null;
      buzz(verdict.kind === 'perfect' ? 22 : 12);
      if (s.expected >= n) {
        s.done = true;
        syncUi();
        setTimeout(() => onCompleteRef.current(
          buildResult(s.orderErrors, s.scores, s.hints, s.autoHints)), 750);
        return;
      }
      syncUi();
      return;
    }

    // ошибка
    s.flash.push({ pts: user, t0: performance.now() });
    buzz(30);
    if (verdict.kind === 'order') {
      s.orderErrors++;
      say(`Порядок нарушен: это черта ${verdict.matchIndex + 1}, а нужна ${s.expected + 1}`);
    } else if (verdict.kind === 'repeat') {
      say(`Черта ${verdict.matchIndex + 1} уже написана`);
    } else if (verdict.kind === 'reversed') {
      s.fails++;
      say('Не то направление — красная стрелка покажет верное');
      const ref = strokes[s.expected];
      s.arrow = { x: ref[0].x, y: ref[0].y, angle: angleOf(ref[0], ref[ref.length - 1]), mode: 'dir' };
    } else {
      s.fails++;
      say('Не совпадает с эталоном');
      if (s.fails >= 2) { autoGhost(); say('Два промаха — показываю подсказку'); }
    }
    syncUi();
  };

  /* ---------- кнопки ---------- */
  const undo = () => {
    const s = sim.current;
    if (!s.accepted.length || s.done) return;
    s.accepted.pop(); s.scores.pop(); s.expected--;
    syncUi();
  };
  const clearAll = () => {
    const s = sim.current;
    if (s.done) return;
    s.accepted = []; s.scores = []; s.expected = 0; s.flash = []; s.arrow = null; s.fails = 0;
    syncUi();
  };
  const hint = () => {
    const s = sim.current;
    if (s.done) return;
    s.ghost = { pts: strokes[s.expected], t0: performance.now() };
    s.hints++;
    s.fails = 0;
    say('Подсказка: повтори красную черту');
    syncUi();
  };

  /* ---------- цикл отрисовки ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = Math.round(wrap.clientWidth);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const size = canvas.clientWidth || 300;
      const C = darkRef.current ? COLORS.dark : COLORS.light;
      const s = sim.current;
      ctx.clearRect(0, 0, size, size);

      /* сетка 米字格 */
      const P = (v: number) => v * size;
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(P(0.012), P(0.012), size - P(0.024), size - P(0.024));
      ctx.strokeStyle = C.gridSoft;
      ctx.lineWidth = 1;
      ctx.setLineDash([P(0.018), P(0.022)]);
      for (const [x1, y1, x2, y2] of [
        [0.5, 0.012, 0.5, 0.988], [0.012, 0.5, 0.988, 0.5],
        [0.012, 0.012, 0.988, 0.988], [0.988, 0.012, 0.012, 0.988],
      ]) {
        ctx.beginPath(); ctx.moveTo(P(x1), P(y1)); ctx.lineTo(P(x2), P(y2)); ctx.stroke();
      }
      ctx.setLineDash([]);

      const toPx = (pts: Pt[]) => pts.map((p) => ({ x: P(p.x), y: P(p.y) }));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      /* метка ожидаемого старта */
      if (!s.done && s.expected < n) {
        const st = strokes[s.expected][0];
        const pulse = 1 + 0.25 * Math.sin(performance.now() / 260);
        ctx.strokeStyle = C.start;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(P(st.x), P(st.y), P(0.026) * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* призрак-подсказка */
      if (s.ghost) {
        const dt = performance.now() - s.ghost.t0;
        if (dt < 950) {
          ctx.strokeStyle = C.ghost;
          ctx.lineWidth = P(0.028);
          ctx.globalAlpha = 0.85;
          drawPartial(ctx, toPx(s.ghost.pts), dt / 950);
          ctx.globalAlpha = 1;
        } else if (dt < 2800) {
          ctx.strokeStyle = C.ghost;
          ctx.lineWidth = P(0.02);
          ctx.globalAlpha = 0.32;
          ctx.setLineDash([P(0.02), P(0.028)]);
          drawSmooth(ctx, toPx(s.ghost.pts));
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        } else {
          s.ghost = null;
        }
      }

      /* принятые черты */
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = P(0.034);
      for (const st of s.accepted) drawSmooth(ctx, toPx(st));

      /* красные вспышки ошибок */
      s.flash = s.flash.filter((f) => performance.now() - f.t0 < 650);
      for (const f of s.flash) {
        const k = 1 - (performance.now() - f.t0) / 650;
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = P(0.032);
        ctx.globalAlpha = clamp01(k) * 0.9;
        drawSmooth(ctx, toPx(f.pts));
        ctx.globalAlpha = 1;
      }

      /* живая черта */
      if (s.live && s.live.length > 1) {
        ctx.strokeStyle = s.arrow?.mode === 'dir' ? C.bad : C.ink;
        ctx.lineWidth = P(0.034);
        drawSmooth(ctx, toPx(s.live));
      }

      /* красная стрелка-подсказка направления */
      if (s.arrow && !s.done) {
        const a = s.arrow;
        const blink = 0.6 + 0.4 * Math.sin(performance.now() / 110);
        ctx.strokeStyle = C.bad;
        ctx.fillStyle = C.bad;
        ctx.globalAlpha = blink;
        if (a.mode === 'dir') {
          const L = P(0.115);
          const x = P(a.x), y = P(a.y);
          const dx = Math.cos(a.angle), dy = Math.sin(a.angle);
          ctx.lineWidth = P(0.016);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + dx * L, y + dy * L);
          ctx.stroke();
          const hx = x + dx * L, hy = y + dy * L;
          const ha = P(0.045);
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx - dx * ha - dy * ha * 0.62, hy - dy * ha + dx * ha * 0.62);
          ctx.lineTo(hx - dx * ha + dy * ha * 0.62, hy - dy * ha - dx * ha * 0.62);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.lineWidth = P(0.014);
          ctx.beginPath();
          ctx.arc(P(a.x), P(a.y), P(0.042), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expName = ui.expected < n ? inferStrokeName(strokes[ui.expected]) : null;

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      {/* контекст */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="truncate text-[12px] font-semibold text-ink-2 dark:text-bone-2">{posLabel}</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-ink-2 dark:border-mist dark:text-bone-2">
          <IconCheck size={13} className="text-seal dark:text-ember" /> ПРАКТИКА
        </span>
      </div>

      {/* пиньинь и перевод — иероглиф скрыт */}
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="font-display text-[38px] leading-none text-ink dark:text-bone">{char.pinyin}</div>
          <div className="mt-1 text-[14px] font-bold text-seal dark:text-ember">{char.en} <span className="font-medium text-ink-3 dark:text-bone-2">· {char.ru}</span></div>
        </div>
        <div key={ui.expected} className="anim-fade-in text-right">
          {ui.done ? (
            <span className="inline-block rounded-md bg-seal px-2.5 py-1.5 text-[12.5px] font-extrabold text-paper dark:bg-ember dark:text-night">Готово!</span>
          ) : (
            <>
              <div className="text-[12px] font-extrabold text-ink dark:text-bone">Черта {ui.expected + 1} / {n}</div>
              {expName && (
                <div className="text-[11.5px] font-semibold text-ink-3 dark:text-bone-2">
                  <span className="font-brush text-[15px] text-seal dark:text-ember">{expName.zh}</span> {expName.py} · {expName.ru}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* точки-черты */}
      <div className="mt-2.5 flex items-center gap-1.5">
        {strokes.map((_, i) => (
          <span key={i} className={`h-[7px] flex-1 rounded-full transition-colors duration-300 ${
            i < ui.count ? 'bg-seal dark:bg-ember'
              : i === ui.count && !ui.done ? 'animate-[pulse-dot_1.1s_ease-in-out_infinite] bg-ink/45 dark:bg-bone/40'
              : 'bg-line dark:bg-mist'}`} />
        ))}
      </div>

      {/* холст */}
      <div className="relative mx-auto mt-3 w-full max-w-[350px] flex-1 min-h-0">
        <div ref={wrapRef} className="relative aspect-square w-full">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none select-none rounded-md border-[1.5px] border-line bg-paper shadow-[inset_0_0_0_1px_rgba(29,27,22,0.03)] dark:border-mist dark:bg-night-2"
            style={{ cursor: 'crosshair' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {toast && (
            <div key={toast.id} className="anim-fade-up pointer-events-none absolute left-1/2 top-3 z-10 w-max max-w-[92%] -translate-x-1/2 rounded-md bg-ink/92 px-3 py-1.5 text-center text-[12px] font-bold text-paper shadow-lg dark:bg-bone/95 dark:text-night">
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      {/* управление одной рукой — у большого пальца */}
      <div className="mt-3.5">
        <div className="flex gap-2.5">
          <button onClick={undo} disabled={ui.count === 0 || ui.done}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-[1.5px] border-ink/70 py-3 text-[13.5px] font-bold text-ink transition-all duration-150 hover:bg-paper-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30 dark:border-bone/60 dark:text-bone dark:hover:bg-night-3">
            <IconUndo size={16} /> Отмена
          </button>
          <button onClick={clearAll} disabled={ui.count === 0 || ui.done} aria-label="Очистить холст"
            className="grid w-[52px] place-items-center rounded-md border-[1.5px] border-line text-ink-2 transition-all duration-150 hover:bg-paper-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30 dark:border-mist dark:text-bone-2 dark:hover:bg-night-3">
            <IconTrash size={16} />
          </button>
          <button onClick={hint} disabled={ui.done}
            className="flex flex-[1.25] items-center justify-center gap-1.5 rounded-md bg-seal py-3 text-[13.5px] font-extrabold text-paper transition-all duration-150 hover:bg-seal-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30 dark:bg-ember dark:text-night dark:hover:bg-seal">
            <IconBulb size={16} /> Подсказка
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] font-semibold text-ink-3 dark:text-bone-2">
          подсказка ограничивает оценку до ★★ · рисуйте от серой метки
        </p>
      </div>
    </div>
  );
}
