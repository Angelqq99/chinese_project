import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const graphics = readFileSync('public/graphics.txt', 'utf8').trim().split('\n').map(line => JSON.parse(line));
const love = graphics.find(entry => entry.character === '爱').medians as number[][][];

async function openPractice(page: Page) {
  await page.getByRole('button', { name: /HSK 1 ·/ }).click();
  await page.getByRole('button', { name: /Пачка 1\b/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
}

async function trace(page: Page, stroke: number[][], cancel = false) {
  await page.locator('canvas').evaluate((canvas, { stroke, cancel }) => {
    const rect = canvas.getBoundingClientRect();
    const dispatch = (type: string, point: number[]) => canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 1, isPrimary: true, pointerType: 'touch',
      clientX: rect.left + point[0] / 1024 * rect.width,
      clientY: rect.top + (1 - point[1] / 1024) * rect.height,
    }));
    // Synthetic pointer events cannot acquire browser pointer capture.
    canvas.setPointerCapture = () => {};
    dispatch('pointerdown', stroke[0]);
    stroke.slice(1).forEach(point => dispatch('pointermove', point));
    dispatch(cancel ? 'pointercancel' : 'pointerup', stroke[stroke.length - 1]);
  }, { stroke, cancel });
}

for (const viewport of [{ width: 360, height: 640 }, { width: 320, height: 568 }, { width: 740, height: 360 }]) {
  test(`practice controls stay below the canvas at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Native builds serve all these files locally, with no remote font/data requests.
    const external: string[] = [];
    await page.route('**/*', route => {
      if (new URL(route.request().url()).hostname !== '127.0.0.1') {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.goto('/');
    await openPractice(page);
    const canvas = await page.locator('canvas').boundingBox();
    const hint = await page.getByRole('button', { name: 'Подсказка' }).boundingBox();
    expect(hint!.y).toBeGreaterThanOrEqual(canvas!.y + canvas!.height);
    await page.getByRole('button', { name: 'Подсказка' }).click();
    await expect(page.getByText('Подсказка: повтори красную черту')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(external).toEqual([]);
  });
}

test('canceled strokes are discarded; completing a character persists progress and theme', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await openPractice(page);
  await trace(page, love[0], true);
  await expect(page.getByText(`Черта 1 / ${love.length}`, { exact: true })).toBeVisible();
  for (const stroke of love) await trace(page, stroke);
  await expect(page.getByRole('button', { name: 'Далее' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cherta-progress-v1')!).stars.l0p0w0c0)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Переключить тему' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Уровни HSK' })).toBeVisible();
  await expect(page.locator('#root > .dark')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cherta-progress-v1')!).stars.l0p0w0c0)).toBeGreaterThan(0);
});

test('a failed initial data load can be retried', async ({ page }) => {
  let fail = true;
  await page.route('**/graphics.txt', route => fail ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.continue());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить');
  fail = false;
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await openPractice(page);
});
