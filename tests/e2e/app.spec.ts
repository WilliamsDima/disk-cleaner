import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Полный путь через интерфейс, но на искусственной папке: настоящие файлы не затрагиваются.

const DAY_MS = 24 * 60 * 60 * 1000;

function put(file: string, ageDays = 0, size = 3 * 1024 * 1024): string {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.alloc(size));
  const when = new Date(Date.now() - ageDays * DAY_MS);
  utimesSync(file, when, when);
  return file;
}

let root: string;
let app: ElectronApplication;
let page: Page;

test.beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), 'disk-cleaner-e2e-'));
  // Терминал VS Code выставляет ELECTRON_RUN_AS_NODE, с ней Electron запускается как обычный Node.
  const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;
  app = await electron.launch({
    args: ['.'],
    env: { ...env, DISK_CLEANER_SANDBOX: root } as Record<string, string>,
  });
  page = await app.firstWindow();
});

test.afterEach(async () => {
  await app.close();
  rmSync(root, { recursive: true, force: true });
});

test('окно закрыто от Node.js', async () => {
  const exposed = await page.evaluate(() => ({
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
    methods: Object.keys(window.cleaner).sort(),
  }));
  expect(exposed.require).toBe('undefined');
  expect(exposed.process).toBe('undefined');
  expect(exposed.methods).toEqual(['clean', 'getDisk', 'listRules', 'onProgress', 'openLog', 'scan']);
});

test('выбор, подтверждение и чистка затрагивают только отмеченное', async () => {
  const oldTemp = put(path.join(root, 'Local', 'Temp', 'old.tmp'), 30);
  const freshTemp = put(path.join(root, 'Local', 'Temp', 'fresh.tmp'), 1);
  const key = put(path.join(root, 'Local', 'Temp', 'old.key'), 30);
  const dump = put(path.join(root, 'Local', 'CrashDumps', 'a.dmp'));
  const npm = put(path.join(root, 'Local', 'npm-cache', '_cacache', 'x.bin'));

  await page.getByRole('button', { name: 'Пересчитать' }).click();
  const primary = page.getByRole('button', { name: /Освободить/ });
  await expect(primary).toBeEnabled();

  // Снимаем дампы, кэш npm выбран не был.
  await page.getByTestId('rule-crash-dumps').click();
  await expect(page.getByTestId('rule-crash-dumps').getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByTestId('rule-npm').getByRole('checkbox')).not.toBeChecked();

  await primary.click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('Временные файлы');
  await expect(confirm).not.toContainText('Дампы');
  await expect(confirm.getByRole('button', { name: 'Отмена' })).toBeFocused();

  // Отмена ничего не удаляет.
  await confirm.getByRole('button', { name: 'Отмена' }).click();
  expect(existsSync(oldTemp)).toBe(true);

  await primary.click();
  await page.screenshot({ path: 'test-results/confirm.png' });
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByTestId('result-freed')).toContainText('3 МБ');
  await page.screenshot({ path: 'test-results/result.png' });

  const logs = readdirSync(path.join(root, 'logs'));
  expect(logs).toHaveLength(1);
  const log = readFileSync(path.join(root, 'logs', logs[0] ?? ''), 'utf8');
  expect(log).toContain('Временные файлы');

  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click();

  expect(existsSync(oldTemp)).toBe(false);
  expect(existsSync(freshTemp)).toBe(true);
  expect(existsSync(key)).toBe(true);
  expect(existsSync(dump)).toBe(true);
  expect(existsSync(npm)).toBe(true);
});
