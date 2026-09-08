// src/lib/charUtils.ts
import { LEVELS } from '../data/characters';
import { loadStrokesForPack } from '../data/characters';
import type { Pt } from './geometry';

export interface WordData {
  word: string;          // само слово (строка из иероглифов)
  pinyin: string;
  en: string;
  ru: string;
  chars: string[];       // массив иероглифов
  strokesMap: Map<string, Pt[][]>; // данные для каждого иероглифа
}

/**
 * Загружает все слова из всех уровней и пачек,
 * возвращает массив объектов WordData для слов,
 * для которых есть данные о чертах всех символов.
 */
export async function getAllWords(): Promise<WordData[]> {
  const result: WordData[] = [];
  for (const level of LEVELS) {
    for (const pack of level.packs) {
      const strokesMap = await loadStrokesForPack(pack);
      for (const word of pack.words) {
        // Проверяем, что для всех символов есть данные
        const allHaveStrokes = word.chars.every(ch => strokesMap.has(ch));
        if (allHaveStrokes) {
          result.push({
            word: word.chars.join(''),
            pinyin: word.pinyin,
            en: word.en,
            ru: word.ru,
            chars: word.chars,
            strokesMap,
          });
        }
      }
    }
  }
  return result;
}