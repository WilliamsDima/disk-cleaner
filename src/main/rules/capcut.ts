import path from 'node:path';
import type { CleanPlan, CleanerEnv, FileSystem } from '../domain/types';

const VERSION_DIR = /^\d+(\.\d+){3}$/;
const VERSIONS_TO_KEEP = 2;
const CACHE_DIRS = ['SmartCrop', 'bytebench', 'frameThumbnail', 'audioWave', 'image', 'recognize'];

function compareVersionsDesc(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 4; i += 1) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Оставляет текущую и предыдущую версии, а также ту, что указана в ProductInfo.xml. */
export async function resolveCapCutVersions(env: CleanerEnv, fs: FileSystem): Promise<CleanPlan> {
  const apps = path.join(env.local, 'CapCut', 'Apps');
  if ((await fs.kindOf(apps)) !== 'directory') return { unavailable: 'CapCut не установлен' };

  const versions = (await fs.readDir(apps))
    .filter((entry) => entry.kind === 'directory' && VERSION_DIR.test(entry.name))
    .map((entry) => entry.name)
    .sort(compareVersionsDesc);
  const newest = versions[0];
  if (newest === undefined) return { specs: [] };
  if ((await fs.kindOf(path.join(apps, newest, 'CapCut.exe'))) !== 'file') {
    return { unavailable: 'В новейшей версии нет CapCut.exe, старые не удаляю' };
  }

  const keep = new Set(versions.slice(0, VERSIONS_TO_KEEP));
  try {
    const info = await fs.readText(path.join(apps, 'ProductInfo.xml'));
    const current = /full_appver value="([\d.]+)"/.exec(info)?.[1];
    if (current) keep.add(current);
  } catch {
    // Файла может не быть, две новейшие версии остаются в любом случае.
  }
  return {
    specs: versions
      .filter((version) => !keep.has(version))
      .map((version) => ({ path: path.join(apps, version), removeRoot: true })),
  };
}

export async function resolveCapCutCache(env: CleanerEnv): Promise<CleanPlan> {
  const cache = path.join(env.local, 'CapCut', 'User Data', 'Cache');
  return { specs: CACHE_DIRS.map((name) => ({ path: path.join(cache, name), removeRoot: true })) };
}
