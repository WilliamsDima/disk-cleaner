import path from 'node:path';
import type { CleanPlan, CleanSpec, CleanerEnv, FileSystem } from '../domain/types';

async function subdirs(fs: FileSystem, dir: string): Promise<string[]> {
  const entries = await fs.readDir(dir);
  return entries.filter((entry) => entry.kind === 'directory').map((entry) => entry.name);
}

/** Находит все эмуляторы. Устаревший .ini, указывающий на удалённый эмулятор, не мешает. */
async function findAvdDirs(env: CleanerEnv, fs: FileSystem): Promise<string[]> {
  const found = new Map<string, string>();
  for (const entry of await fs.readDir(env.avdHome)) {
    const full = path.join(env.avdHome, entry.name);
    if (entry.kind === 'directory' && entry.name.toLowerCase().endsWith('.avd')) {
      found.set(full.toLowerCase(), full);
    }
    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.ini')) {
      const match = /^path\s*=\s*(.+)$/m.exec(await fs.readText(full));
      const target = match?.[1]?.trim();
      if (target && (await fs.kindOf(target)) === 'directory') found.set(target.toLowerCase(), target);
    }
  }
  return [...found.values()];
}

/**
 * Удаляет только образы, на которые не ссылается ни один эмулятор.
 * Если настройки хоть одного эмулятора непонятны, не удаляет ничего.
 */
export async function resolveAndroidImages(env: CleanerEnv, fs: FileSystem): Promise<CleanPlan> {
  const imagesRoot = path.join(env.sdk, 'system-images');
  if ((await fs.kindOf(imagesRoot)) !== 'directory') return { unavailable: 'Android SDK не найден' };
  if ((await fs.kindOf(env.avdHome)) !== 'directory') {
    return { unavailable: 'Не найдена папка эмуляторов, не знаю, какие образы нужны' };
  }

  const avdDirs = await findAvdDirs(env, fs);
  if (avdDirs.length === 0) return { unavailable: 'Не найдено ни одного эмулятора, не знаю, какие образы нужны' };

  const used = new Set<string>();
  for (const avdDir of avdDirs) {
    let config: string;
    try {
      config = await fs.readText(path.join(avdDir, 'config.ini'));
    } catch {
      return { unavailable: `Нет настроек эмулятора: ${path.basename(avdDir)}` };
    }
    const sysdirs = [...config.matchAll(/^image\.sysdir\.\d+\s*=\s*(.+)$/gm)];
    if (sysdirs.length === 0)
      return { unavailable: `В настройках эмулятора не указан образ: ${path.basename(avdDir)}` };
    for (const sysdir of sysdirs) {
      const normalized = (sysdir[1] ?? '').trim().replaceAll('/', '\\').replace(/\\+$/, '');
      const relative = /(system-images\\.+)$/i.exec(normalized)?.[1];
      if (!relative) return { unavailable: `Непонятный образ в настройках: ${normalized}` };
      used.add(relative.toLowerCase());
    }
  }

  const specs: CleanSpec[] = [];
  for (const api of await subdirs(fs, imagesRoot)) {
    for (const tag of await subdirs(fs, path.join(imagesRoot, api))) {
      for (const abi of await subdirs(fs, path.join(imagesRoot, api, tag))) {
        const key = path.join('system-images', api, tag, abi).toLowerCase();
        if (!used.has(key)) {
          specs.push({ path: path.join(imagesRoot, api, tag, abi), removeRoot: true, pruneUpTo: imagesRoot });
        }
      }
    }
  }
  return { specs };
}
