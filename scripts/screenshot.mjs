// Снимает окно с настоящими размерами, чтобы посмотреть на интерфейс.
// Только считает: кнопки чистки не нажимаются.
// Запуск: node scripts/screenshot.mjs <файл.png> [--packaged]
import { _electron as electron } from '@playwright/test';

const output = process.argv[2];
if (!output) throw new Error('Укажи путь к PNG');

// Терминал VS Code выставляет ELECTRON_RUN_AS_NODE, с ней Electron запускается как обычный Node.
const { ELECTRON_RUN_AS_NODE: _ignored, DISK_CLEANER_SANDBOX: _sandbox, ...env } = process.env;
const packaged = process.argv.includes('--packaged');
const app = await electron.launch(
  packaged ? { executablePath: 'release/DiskCleaner-win32-x64/DiskCleaner.exe', args: [], env } : { args: ['.'], env },
);
try {
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Пересчитать' }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector('[role="status"]')?.textContent?.includes('Считаю'),
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: output });
  const rows = await page.$$eval('[data-testid^="rule-"]', (nodes) =>
    nodes.map((node) => {
      const checkbox = node.querySelector('input');
      return `${checkbox?.checked ? '[x]' : checkbox?.disabled ? '[-]' : '[ ]'} ${node.innerText.replace(/\s*\n\s*/g, ' | ')}`;
    }),
  );
  console.log(rows.join('\n'));
} finally {
  await app.close();
}
