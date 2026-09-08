// src/data/hskLoader.ts
import type { Level } from './types';

// URL с полным JSON-файлом (замените на свой)
const HSK_DATA_URL = 'https://cdn.jsdelivr.net/gh/your-repo/hsk-data/hsk-full.json';

const DB_NAME = 'cherta-hsk-v1';
const STORE_NAME = 'hskLists';

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

async function loadFromCache(): Promise<Level[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('levels');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToCache(levels: Level[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(levels, 'levels');
  } catch (e) {
    console.warn('Не удалось кэшировать списки HSK:', e);
  }
}

async function fetchFromRemote(): Promise<Level[]> {
  const res = await fetch(HSK_DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  await saveToCache(data);
  return data;
}

export async function loadHskLevels(): Promise<Level[]> {
  const cached = await loadFromCache();
  if (cached) return cached;
  return fetchFromRemote();
}