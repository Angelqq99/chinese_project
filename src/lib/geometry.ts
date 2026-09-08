/* ============================================================
 * Геометрия жестов: точки, длины, углы, передискретизация.
 * Все координаты хранятся нормализованными в квадрате 0..1.
 * ============================================================ */

export interface Pt {
  x: number;
  y: number;
}

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

export const last = <T,>(arr: T[]): T => arr[arr.length - 1];

export function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return len;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);

export function bboxDiag(pts: Pt[]): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return Math.hypot(maxX - minX, maxY - minY) || 1e-6;
}

/**
 * Передискретизация полилинии в n равноудалённых точек по длине дуги.
 * Ключевой приём: i-я точка пользовательской траектории сопоставляется
 * i-й точке эталона — так учитывается ПОРЯДОК появления точек
 * (черта, проведённая задом наперёд, даст большие расстояния).
 */
export function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const total = pathLength(pts);
  if (total < 1e-9) return Array.from({ length: n }, () => pts[0]);
  const step = total / (n - 1);
  const out: Pt[] = [{ ...pts[0] }];
  let carry = 0;
  let i = 1;
  while (out.length < n - 1 && i < pts.length) {
    const seg = dist(pts[i - 1], pts[i]);
    if (carry + seg >= step) {
      const t = (step - carry) / seg;
      const np: Pt = {
        x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
      };
      pts = [np, ...pts.slice(i)];
      i = 1;
      carry = 0;
      out.push(np);
    } else {
      carry += seg;
      i++;
    }
  }
  while (out.length < n) out.push({ ...last(pts) });
  return out;
}

/** Угол направления отрезка a→b, радианы. */
export const angleOf = (a: Pt, b: Pt): number => Math.atan2(b.y - a.y, b.x - a.x);

/** Разница двух углов в градусах, 0..180. */
export function angleDiffDeg(a1: number, a2: number): number {
  let d = Math.abs(a1 - a2) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}

/** Направление всей черты (вектор старт→финиш). */
export const directionOf = (pts: Pt[]): number => angleOf(pts[0], last(pts));

/** Ожидаемое направление эталонной черты в момент прогресса t (0..1). */
export function expectedDirectionAt(ref: Pt[], t: number): number {
  const r = resample(ref, 24);
  const i = clamp(Math.floor(t * (r.length - 1)), 0, r.length - 2);
  return angleOf(r[i], r[Math.min(i + 3, r.length - 1)]);
}

/** Доля пройденной пользователем дуги относительно длины эталона. */
export function arcProgress(user: Pt[], ref: Pt[]): number {
  return clamp01(pathLength(user) / (pathLength(ref) || 1e-6));
}

/** Упрощение: выбрасываем точки ближе eps (дрожание пальца игнорируем). */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    if (dist(last(out), pts[i]) >= eps) out.push(pts[i]);
  }
  out.push(last(pts));
  // Если после упрощения осталось меньше 2 точек, возвращаем исходные
  if (out.length < 2) return pts;
  return out;
}

/* ---------- сглаженные траектории (квадратики через середины) ---------- */

export function buildSmoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  d += ` L ${last(pts).x} ${last(pts).y}`;
  return d;
}

export function drawSmooth(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.lineTo(last(pts).x, last(pts).y);
  ctx.stroke();
}

/** Частичная отрисовка черты (для призрака-подсказки), доля f: 0..1. */
export function drawPartial(ctx: CanvasRenderingContext2D, pts: Pt[], f: number) {
  if (pts.length < 2 || f <= 0) return;
  const total = pathLength(pts);
  const target = total * clamp01(f);
  const out: Pt[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= target) {
      const t = (target - acc) / seg;
      out.push({
        x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
      });
      break;
    }
    acc += seg;
    out.push(pts[i]);
  }
  drawSmooth(ctx, out);
}

/* ---------- автоопределение типа черты по геометрии ---------- */

export interface StrokeName {
  zh: string;
  py: string;
  ru: string;
}

export function inferStrokeName(pts: Pt[]): StrokeName {
  const len = pathLength(pts);
  const dir = directionOf(pts);
  const deg = (dir * 180) / Math.PI; // -180..180, 0 = вправо, 90 = вниз
  // есть ли резкий излом (折)?
  let hasCorner = false;
  for (let i = 1; i < pts.length - 1; i++) {
    const d1 = angleOf(pts[i - 1], pts[i]);
    const d2 = angleOf(pts[i], pts[i + 1]);
    if (angleDiffDeg(d1, d2) > 42) { hasCorner = true; break; }
  }
  const short = len < 0.16;
  if (short && deg > 30 && deg < 150) return { zh: '点', py: 'diǎn', ru: 'точка' };
  if (hasCorner) {
    const endUp = pts.length > 2 && last(pts).y < pts[pts.length - 2].y - 0.02;
    if (endUp) return { zh: '钩', py: 'gōu', ru: 'черта с крюком' };
    return { zh: '折', py: 'zhé', ru: 'излом' };
  }
  if (Math.abs(deg) <= 22) return { zh: '横', py: 'héng', ru: 'горизонталь' };
  if (deg > 60 && deg < 120) return { zh: '竖', py: 'shù', ru: 'вертикаль' };
  if (deg > 100 && deg <= 170) return { zh: '撇', py: 'piě', ru: 'откидная влево' };
  if (deg > 20 && deg <= 60) return { zh: '捺', py: 'nà', ru: 'откидная вправо' };
  if (deg < -20) return { zh: '提', py: 'tí', ru: 'восходящая' };
  return { zh: '撇', py: 'piě', ru: 'откидная влево' };
}
