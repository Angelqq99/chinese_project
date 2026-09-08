// scripts/build_hsk.js (или .cjs)
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const HSK_URLS = {
  1: 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-1.json',
  2: 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-2.json',
  3: 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-3.json',
  4: 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-4.json',
  5: 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-5.json',
  6: 'https://raw.githubusercontent.com/clem109/hsk-vocabulary/master/hsk-vocab-json/hsk-level-6.json',
};

const WORDS_PER_PACK = 12; // по 12 слов в пачке

async function fetchHsk(level) {
  const url = HSK_URLS[level];
  console.log(`Загрузка HSK ${level}...`);
  const res = await axios.get(url);
  return res.data;
}

function buildPacks(words, level) {
  const packs = [];
  for (let i = 0; i < words.length; i += WORDS_PER_PACK) {
    const chunk = words.slice(i, i + WORDS_PER_PACK);
    const packId = `h${level}-pack-${Math.floor(i / WORDS_PER_PACK) + 1}`;
    const title = `Пачка ${Math.floor(i / WORDS_PER_PACK) + 1}`;
    const subtitle = `слова ${i + 1}–${Math.min(i + WORDS_PER_PACK, words.length)}`;
    packs.push({
      id: packId,
      title,
      subtitle,
      words: chunk.map(w => ({
        word: w.hanzi,
        pinyin: w.pinyin,
        en: w.translations ? w.translations.join('; ') : w.english || '',
        ru: w.translations ? w.translations.join('; ') : w.russian || w.english || '',
        chars: w.hanzi.split(''),
      })),
    });
  }
  return packs;
}

async function main() {
  const levels = [];
  for (let lv = 1; lv <= 6; lv++) {
    const words = await fetchHsk(lv);
    const packs = buildPacks(words, lv);
    levels.push({
      hsk: lv,
      title: `HSK ${lv}`,
      packs,
    });
  }

  const output = `// src/data/hsk-full.ts\nimport type { Level } from './types';\n\nexport const LEVELS: Level[] = ${JSON.stringify(levels, null, 2)};\n`;

  const outPath = path.join(__dirname, '..', 'src', 'data', 'hsk-full.ts');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`✅ Файл сохранён: ${outPath}`);
  const total = levels.reduce((sum, l) => sum + l.packs.reduce((s, p) => s + p.words.length, 0), 0);
  console.log(`Всего слов: ${total}`);
}

main().catch(console.error);