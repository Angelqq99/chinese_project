/**
 * Сервис загрузки данных из Make Me a Hanzi
 * https://github.com/skishore/makemeahanzi
 *
 * Содержит векторы черт для всех 9500+ иероглифов.
 * Данные кэшируются в IndexedDB для офлайн-режима.
 */

import type { Pt } from './geometry';

interface MMHStroke {
  points: number[][];
}

interface MMHChar {
  character: string;
  strokes: MMHStroke[];
}

interface MMHData {
  [char: string]: MMHChar;
}

const DB_NAME = 'cherta-mmh-v1';
const STORE_NAME = 'graphics';
const GRAPHICS_URL = 'https://cdn.jsdelivr.net/gh/skishore/makemeahanzi@master/graphics.txt';

let cache: MMHData | null = null;
let loadingPromise: Promise<MMHData> | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromCache(): Promise<MMHData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('data');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToCache(data: MMHData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, 'data');
  } catch (e) {
    console.warn('Не удалось кэшировать данные Make Me a Hanzi:', e);
  }
}

async function fetchFromRemote(): Promise<MMHData> {
  const res = await fetch(GRAPHICS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const data = JSON.parse(text) as MMHData;
  await saveToCache(data);
  return data;
}

export async function loadMakeMeHanzi(): Promise<MMHData> {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const cached = await loadFromCache();
    if (cached) {
      cache = cached;
      return cached;
    }
    const data = await fetchFromRemote();
    cache = data;
    return data;
  })();

  return loadingPromise;
}

export function getStrokes(char: string, data: MMHData): Pt[][] | null {
  const entry = data[char];
  if (!entry || !entry.strokes) return null;
  return entry.strokes.map((s) =>
    s.points.map(([x, y]) => ({ x: x / 1024, y: y / 1024 }))
  );
}

export function hasChar(char: string, data: MMHData): boolean {
  return char in data;
}
