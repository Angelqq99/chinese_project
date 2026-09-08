// src/lib/makemeahanzi.ts
import type { Pt } from './geometry';

const DB_NAME = 'cherta-mmh-v1';
const STORE_NAME = 'graphics';
const LOCAL_GRAPHICS_URL = '/graphics.txt'; // Убедитесь, что файл лежит в public/

let cache: any = null;
let loadingPromise: Promise<any> | null = null;

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

async function loadFromCache(): Promise<any> {
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

async function saveToCache(data: any): Promise<void> {
	try {
		const db = await openDB();
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		store.put(data, 'data');
	} catch (e) {
		console.warn('Не удалось кэшировать данные Make Me a Hanzi:', e);
	}
}

async function fetchGraphics(): Promise<any> {
	const res = await fetch(LOCAL_GRAPHICS_URL);
	if (!res.ok) throw new Error(`Не удалось загрузить ${LOCAL_GRAPHICS_URL} (статус ${res.status})`);
	const text = await res.text();

	// Старый формат: var graphics = {...}
	const match = text.match(/var\s+graphics\s*=\s*({[\s\S]*});?/);
	if (match) {
		try {
			return JSON.parse(match[1]);
		} catch (e) {
			throw new Error('Ошибка парсинга JSON в старом формате: ' + e.message);
		}
	}

	// Новый формат: построчный JSON (как в вашем примере)
	const lines = text.split('\n').filter(line => line.trim().length > 0);
	const result: Record<string, any> = {};
	for (const line of lines) {
		try {
			const obj = JSON.parse(line);
			// Проверяем наличие character и medians (это самый надежный источник для рисования линий)
			if (obj.character && obj.medians) {
				result[obj.character] = obj;
			} else if (obj.character && obj.strokes) {
				// Фоллбэк, если medians нет, но есть strokes (редко для новых форматов)
				result[obj.character] = obj;
			}
		} catch (e) {
			// Игнорируем невалидные строки
		}
	}

	if (Object.keys(result).length === 0) {
		throw new Error('Не удалось распарсить graphics.txt – не найдено ни одного объекта');
	}

	return result;
}

export async function loadMakeMeHanzi(): Promise<any> {
	if (cache) return cache;
	if (loadingPromise) return loadingPromise;

	loadingPromise = (async () => {
		const cached = await loadFromCache();
		if (cached) {
			cache = cached;
			return cached;
		}

		const data = await fetchGraphics();
		await saveToCache(data);
		cache = data;
		return data;
	})();

	return loadingPromise;
}

export function getStrokes(char: string, data: any): Pt[][] | null {
	const entry = data[char];
	if (!entry) return null;

	// ПРИОРИТЕТ: Используем medians (центральные линии черт).
	// Это массив массивов точек [x, y], которые идеально подходят для рисования кистью.
	if (Array.isArray(entry.medians)) {
		return entry.medians.map((median: number[][]) => {
			// Нормализуем координаты: деление на 1024 переводит их в диапазон 0..1
			// Важно: в SVG/Canvas Y растет вниз. Если ваши компоненты ожидают Y вверх, 
			// нужно инвертировать: y: 1 - (y / 1024). 
			// Но стандартные компоненты React обычно работают с SVG координатами (Y вниз).
			return median.map(([x, y]) => ({ x: x / 1024, y: 1 - y / 1024 }));
		});
	}

	// Фоллбэк: Если medians нет, пытаемся использовать старый формат points
	if (entry.strokes && Array.isArray(entry.strokes) && entry.strokes.length > 0 && entry.strokes[0].points) {
		return entry.strokes.map((s: any) =>
			s.points.map(([x, y]: number[]) => ({ x: x / 1024, y: 1 - y / 1024 }))
		);
	}

	return null;
}

export function hasChar(char: string, data: any): boolean {
	return char in data;
}