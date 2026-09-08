// src/lib/svgParser.ts
import type { Pt } from './geometry';

type SvgCommand = {
  cmd: string;
  args: number[];
};

function parseSvgPath(path: string): SvgCommand[] {
  // Удаляем лишние пробелы и разбиваем по командам
  const commands: SvgCommand[] = [];
  // Регулярка для поиска команд и чисел
  const regex = /([MmLlCcQqSsTtAaZz])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  let match: RegExpExecArray | null;
  let lastCmd = '';
  let args: number[] = [];

  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      // Команда
      if (lastCmd && args.length > 0) {
        commands.push({ cmd: lastCmd, args });
        args = [];
      }
      lastCmd = match[1];
    } else if (match[2]) {
      // Число
      args.push(parseFloat(match[2]));
    }
  }
  if (lastCmd && args.length > 0) {
    commands.push({ cmd: lastCmd, args });
  }
  return commands;
}

// Аппроксимация кривой Безье (квадратичной или кубической) отрезками
function bezierToPoints(controlPoints: Pt[], numSegments: number): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    // Функция Де Кастельжо для Безье произвольной степени
    let p = controlPoints.map(p => ({ x: p.x, y: p.y }));
    while (p.length > 1) {
      const next: Pt[] = [];
      for (let j = 0; j < p.length - 1; j++) {
        next.push({
          x: (1 - t) * p[j].x + t * p[j + 1].x,
          y: (1 - t) * p[j].y + t * p[j + 1].y,
        });
      }
      p = next;
    }
    points.push(p[0]);
  }
  return points;
}

/**
 * Преобразует SVG-путь в массив точек (Pt[]).
 * Поддерживает команды: M, L, Q, C, Z (замыкание).
 */
export function svgToPoints(svg: string, numSegments: number = 20): Pt[] {
  const commands = parseSvgPath(svg);
  if (commands.length === 0) return [];

  const result: Pt[] = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  for (let i = 0; i < commands.length; i++) {
    const { cmd, args } = commands[i];
    let subPoints: Pt[] = [];

    switch (cmd) {
      case 'M':
      case 'm': {
        const x = cmd === 'M' ? args[0] : currentX + args[0];
        const y = cmd === 'M' ? args[1] : currentY + args[1];
        startX = x;
        startY = y;
        currentX = x;
        currentY = y;
        // Начинаем новый подпуть
        if (result.length > 0) {
          // Если предыдущая точка отличается от текущей, добавляем разрыв (можно добавить отдельно)
        }
        result.push({ x, y });
        break;
      }
      case 'L':
      case 'l': {
        const x = cmd === 'L' ? args[0] : currentX + args[0];
        const y = cmd === 'L' ? args[1] : currentY + args[1];
        result.push({ x, y });
        currentX = x;
        currentY = y;
        break;
      }
      case 'Q':
      case 'q': {
        // Квадратичная Безье: Q cx cy x y
        const cx = cmd === 'Q' ? args[0] : currentX + args[0];
        const cy = cmd === 'Q' ? args[1] : currentY + args[1];
        const ex = cmd === 'Q' ? args[2] : currentX + args[2];
        const ey = cmd === 'Q' ? args[3] : currentY + args[3];
        const pts = bezierToPoints([
          { x: currentX, y: currentY },
          { x: cx, y: cy },
          { x: ex, y: ey },
        ], numSegments);
        // Добавляем все точки, кроме первой (она уже есть)
        for (let i = 1; i < pts.length; i++) {
          result.push(pts[i]);
        }
        currentX = ex;
        currentY = ey;
        break;
      }
      case 'C':
      case 'c': {
        // Кубическая Безье: C cx1 cy1 cx2 cy2 x y
        const cx1 = cmd === 'C' ? args[0] : currentX + args[0];
        const cy1 = cmd === 'C' ? args[1] : currentY + args[1];
        const cx2 = cmd === 'C' ? args[2] : currentX + args[2];
        const cy2 = cmd === 'C' ? args[3] : currentY + args[3];
        const ex = cmd === 'C' ? args[4] : currentX + args[4];
        const ey = cmd === 'C' ? args[5] : currentY + args[5];
        const pts = bezierToPoints([
          { x: currentX, y: currentY },
          { x: cx1, y: cy1 },
          { x: cx2, y: cy2 },
          { x: ex, y: ey },
        ], numSegments);
        for (let i = 1; i < pts.length; i++) {
          result.push(pts[i]);
        }
        currentX = ex;
        currentY = ey;
        break;
      }
      case 'Z':
      case 'z': {
        // Замыкаем путь к начальной точке
        if (Math.abs(currentX - startX) > 0.01 || Math.abs(currentY - startY) > 0.01) {
          result.push({ x: startX, y: startY });
        }
        currentX = startX;
        currentY = startY;
        break;
      }
      default:
        // Игнорируем другие команды (S, T, A) для простоты
        console.warn(`Команда ${cmd} не поддерживается, пропускаем`);
        break;
    }
  }

  return result;
}