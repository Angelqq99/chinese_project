// src/data/types.ts
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