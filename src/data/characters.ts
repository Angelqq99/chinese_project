// src/data/characters.ts
import { LEVELS as FULL_LEVELS } from './hsk-full';
import type { Level, Pack, Word } from './types';
import { loadMakeMeHanzi, getStrokes, hasChar } from '../lib/makemeahanzi';
import type { Pt } from '../lib/geometry';

export type { Level, Pack, Word };

export const LEVELS = FULL_LEVELS;
export const TOTAL_WORDS = LEVELS.reduce(
  (sum, l) => sum + l.packs.reduce((s, p) => s + p.words.length, 0),
  0
);

export const levelWordCount = (l: Level) =>
  l.packs.reduce((n, p) => n + p.words.length, 0);

export async function loadStrokesForPack(pack: Pack): Promise<Map<string, Pt[][]>> {
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

export async function loadStrokesForChar(char: string): Promise<Pt[][] | null> {
  const mmh = await loadMakeMeHanzi();
  return getStrokes(char, mmh);
}

export async function isCharAvailable(char: string): Promise<boolean> {
  const mmh = await loadMakeMeHanzi();
  return hasChar(char, mmh);
}