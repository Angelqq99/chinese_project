// src/screens/FreePracticeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import PracticeScreen from './PracticeScreen';
import type { WordData } from '../lib/charUtils';

interface Props {
  words: WordData[];
  dark: boolean;
  onHome: () => void;
}

export default function FreePracticeScreen({ words, dark, onHome }: Props) {
  const [currentWord, setCurrentWord] = useState<WordData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0); // индекс текущего иероглифа в слове
  const [sessionKey, setSessionKey] = useState('');

  const pickRandomWord = useCallback(() => {
    if (words.length === 0) return null;
    const idx = Math.floor(Math.random() * words.length);
    return words[idx];
  }, [words]);

  // При монтировании выбираем первое случайное слово
  useEffect(() => {
    const word = pickRandomWord();
    if (word) {
      setCurrentWord(word);
      setCurrentIndex(0);
      setSessionKey(`free-${word.word}-${Date.now()}`);
    }
  }, [pickRandomWord]);

  const handleNext = () => {
    if (!currentWord) return;

    // Если в слове есть ещё иероглифы
    if (currentIndex < currentWord.chars.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Обновляем ключ, чтобы пересоздать PracticeScreen для нового символа
      setSessionKey(`free-${currentWord.word}-${currentIndex + 1}-${Date.now()}`);
    } else {
      // Слово завершено – выбираем новое случайное слово
      const nextWord = pickRandomWord();
      if (nextWord) {
        setCurrentWord(nextWord);
        setCurrentIndex(0);
        setSessionKey(`free-${nextWord.word}-${Date.now()}`);
      } else {
        onHome();
      }
    }
  };

  if (!currentWord) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="text-center text-ink-3 dark:text-bone-2">Нет доступных слов для практики</p>
        <button onClick={onHome} className="mt-4 rounded-md bg-seal px-4 py-2 text-paper dark:bg-ember dark:text-night">
          На главную
        </button>
      </div>
    );
  }

  const char = currentWord.chars[currentIndex];
  const strokes = currentWord.strokesMap.get(char);
  if (!strokes) {
    // Если данных нет – пропускаем символ (такое бывает редко)
    setTimeout(handleNext, 0);
    return null;
  }

  return (
    <PracticeScreen
      key={sessionKey}
      char={char}
      charId={sessionKey}
      pinyin={currentWord.pinyin}
      en={currentWord.en}
      ru={currentWord.ru}
      strokes={strokes}
      posLabel={`🎲 Случайное слово: ${currentWord.word} (${currentIndex + 1}/${currentWord.chars.length})`}
      dark={dark}
      onNext={handleNext}
      onHome={onHome}
    />
  );
}