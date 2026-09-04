/* ============================================================
 * АЛГОРИТМ СРАВНЕНИЯ ЖЕСТОВ (пример из ТЗ, JavaScript/TypeScript)
 * ------------------------------------------------------------
 * Функция comparePointArrays(user, ref, tolerance) сравнивает
 * два массива точек — эталонный и пользовательский — и оценивает
 * корректность черты с допустимой погрешностью ~10 %.
 *
 * Учитывается:
 *  1. совпадение траектории (среднее отклонение точек);
 *  2. ПОРЯДОК появления точек — обе траектории передискретизируются
 *     по длине дуги, поэтому черта, нарисованная «задом наперёд»,
 *     получает большой штраф (flag: reversed);
 *  3. направление (угол вектора старт→финиш);
 *  4. близость начала и конца черты к эталону;
 *  5. мелкие дрожания пальца игнорируются (упрощение + сглаживание
 *     среднего по 28 точкам).
 * ============================================================ */

import {
  Pt, resample, dist, last, bboxDiag, directionOf, angleDiffDeg, clamp01,
} from './geometry';

export interface CompareResult {
  /** относительное среднее отклонение траектории (доля от диагонали эталона) */
  deviation: number;
  /** оценка формы 0..1 (1 — идеал) */
  shape: number;
  /** расхождение общих направлений, градусы 0..180 */
  dirDeg: number;
  /** черта проведена в противоположную сторону */
  reversed: boolean;
  /** промах начала (доля диагонали) */
  startErr: number;
  /** промах конца (доля диагонали) */
  endErr: number;
}

export function comparePointArrays(user: Pt[], ref: Pt[], tolerance = 0.10): CompareResult {
  const diag = bboxDiag(ref);
  const N = 28;
  const u = resample(user, N);
  const r = resample(ref, N);

  let sum = 0;
  for (let i = 0; i < N; i++) sum += dist(u[i], r[i]);
  const deviation = sum / N / diag;

  // 10 % погрешность: при отклонении <= tolerance оценка ещё высока (≈ 2/3),
  // при трёхкратной погрешности — ноль.
  const shape = clamp01(1 - deviation / (tolerance * 3));

  const dirDeg = angleDiffDeg(directionOf(ref), directionOf(user));
  const reversed = dirDeg > 100;
  const startErr = dist(user[0], ref[0]) / diag;
  const endErr = dist(last(user), last(ref)) / diag;

  return { deviation, shape, dirDeg, reversed, startErr, endErr };
}

/* ---------- вердикты для одной черты ---------- */

export type StrokeKind =
  | 'perfect'   // идеальное начертание (кандидат на ★★★)
  | 'accepted'  // порядок и направление верны, форма в допуске
  | 'rejected'  // не совпало с эталоном
  | 'reversed'  // правильное место, но обратное направление
  | 'order'     // черта распознана, но не та по порядку
  | 'repeat'    // уже написанная черта
  | 'tiny';     // случайный тычок

export interface StrokeVerdict extends CompareResult {
  kind: StrokeKind;
  matchIndex: number;
}

const as = (m: CompareResult, kind: StrokeKind, matchIndex: number): StrokeVerdict =>
  ({ ...m, kind, matchIndex });

export function compareStroke(user: Pt[], ref: Pt[], index: number): StrokeVerdict {
  const m = comparePointArrays(user, ref);
  if (m.reversed) return as(m, 'reversed', index);
  if (m.shape >= 0.68 && m.startErr <= 0.20 && m.endErr <= 0.22 && m.dirDeg <= 40)
    return as(m, 'perfect', index);
  if (m.shape >= 0.45 && m.startErr <= 0.30 && m.endErr <= 0.34 && m.dirDeg <= 68)
    return as(m, 'accepted', index);
  return as(m, 'rejected', index);
}

/**
 * Разбор пользовательской черты против ВСЕГО эталонного массива черт:
 * определяет, ту ли черту рисовали, и не нарушен ли порядок.
 */
export function matchStroke(
  user: Pt[],
  strokes: Pt[][],
  expected: number,
): StrokeVerdict {
  // случайный тычок
  let total = 0;
  for (let i = 1; i < user.length; i++) total += dist(user[i - 1], user[i]);
  if (total < 0.035) return as(comparePointArrays(user, strokes[expected]), 'tiny', expected);

  // не повторяет ли уже написанное?
  for (let j = 0; j < expected; j++) {
    const v = compareStroke(user, strokes[j], j);
    if (v.shape >= 0.55 && !v.reversed) return as(v, 'repeat', j);
  }

  const verdicts = strokes.map((s, j) => compareStroke(user, s, j));

  // 1) штатный сценарий — совпала ожидаемая черта
  const exp = verdicts[expected];
  if (exp.kind === 'perfect' || exp.kind === 'accepted') return exp;

  // 2) пользователь нарисовал более позднюю черту → нарушение порядка
  let bestLater: StrokeVerdict | null = null;
  for (let j = expected + 1; j < verdicts.length; j++) {
    const v = verdicts[j];
    if ((v.kind === 'perfect' || v.kind === 'accepted') &&
        (!bestLater || v.shape > bestLater.shape)) bestLater = as(v, 'order', j);
  }
  if (bestLater) return bestLater;

  // 3) иначе возвращаем разбор против ожидаемой черты (rejected/reversed)
  return exp;
}

/* ---------- агрегация результата практики ---------- */

export interface PracticeResult {
  stars: number;        // 1..3
  orderErrors: number;
  shapeAvg: number;     // 0..1
  hintsUsed: number;
  autoHints: number;
  perStroke: number[];  // оценка формы каждой черты
}

/**
 * Правила звёзд (по ТЗ):
 *  ★   — иероглиф узнан (просмотрена анимация) — выставляется вне практики;
 *  ★★  — верный порядок всех черт, форма в допуске;
 *  ★★★ — идеальное начертание: без ошибок порядка, без подсказок,
 *        средняя точность формы ≥ 68 % (≈ погрешность ≤ 10 %).
 */
export function buildResult(
  orderErrors: number,
  perStroke: number[],
  hintsUsed: number,
  autoHints: number,
): PracticeResult {
  const shapeAvg = perStroke.length
    ? perStroke.reduce((a, b) => a + b, 0) / perStroke.length
    : 0;
  let stars = 1;
  if (orderErrors === 0 && shapeAvg >= 0.45) stars = 2;
  if (stars === 2 && hintsUsed === 0 && autoHints === 0 && shapeAvg >= 0.68) stars = 3;
  return { stars, orderErrors, shapeAvg, hintsUsed, autoHints, perStroke };
}
