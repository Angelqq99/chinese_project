/**
 * Главная база данных приложения.
 * Объединяет слова HSK 1-6 и загружает векторы черт из Make Me a Hanzi.
 */

import { HSK1_PACKS } from './hsk1';
import { HSK2_PACKS } from './hsk2';
import { HSK3_PACKS } from './hsk3';
import { HSK4_PACKS } from './hsk4';
import { HSK5_PACKS } from './hsk5';
import { HSK6_PACKS } from './hsk6';
import { loadMakeMeHanzi, getStrokes, hasChar } from '../lib/makemeahanzi';
import type { Pt } from '../lib/geometry';

export interface Word {
  word: string;
  pinyin: string;
  en: string;
  ru: string;
  chars: string[];
}

export interface Pack {
  id: string;
  title: string;
  subtitle: string;
  words: Word[];
}

export interface Level {
  hsk: number;
  title: string;
  packs: Pack[];
}

export const LEVELS: Level[] = [
  { hsk: 1, title: 'Основы', packs: HSK1_PACKS },
  { hsk: 2, title: 'Повседневность', packs: HSK2_PACKS },
  { hsk: 3, title: 'Расширенный', packs: HSK3_PACKS },
  { hsk: 4, title: 'Продвинутый', packs: HSK4_PACKS },
  { hsk: 5, title: 'Профессиональный', packs: HSK5_PACKS },
  { hsk: 6, title: 'Мастер', packs: HSK6_PACKS },
];

export const TOTAL_WORDS = LEVELS.reduce(
  (sum, l) => sum + l.packs.reduce((s, p) => s + p.words.length, 0),
  0
);

export const levelWordCount = (l: Level) =>
  l.packs.reduce((n, p) => n + p.words.length, 0);

/**
 * Загружает векторы черт для всех уникальных иероглифов в пачке.
 * Возвращает Map: иероглиф → массив черт (Pt[][]).
 */
export async function loadStrokesForPack(
  pack: Pack
): Promise<Map<string, Pt[][]>> {
  const mmh = await loadMakeMeHanzi();
  const uniqueChars = new Set<string>();
  pack.words.forEach((w) => w.chars.forEach((c) => uniqueChars.add(c)));

  const strokesMap = new Map<string, Pt[][]>();
  for (const char of uniqueChars) {
    if (hasChar(char, mmh)) {
      const strokes = getStrokes(char, mmh);
      if (strokes) strokesMap.set(char, strokes);
    }
  }
  return strokesMap;
}

/**
 * Загружает векторы черт для одного иероглифа.
 */
export async function loadStrokesForChar(char: string): Promise<Pt[][] | null> {
  const mmh = await loadMakeMeHanzi();
  return getStrokes(char, mmh);
}

/**
 * Проверяет, доступен ли иероглиф в базе Make Me a Hanzi.
 */
export async function isCharAvailable(char: string): Promise<boolean> {
  const mmh = await loadMakeMeHanzi();
  return hasChar(char, mmh);
}
