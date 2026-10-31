import path from 'node:path';
import type { CleanPlan, CleanerEnv, FileSystem } from '../domain/types';

const PROFILE_DIR = /^(Default|Profile \d+)$/;
const CACHE_DIRS = ['Cache', 'Code Cache', 'GPUCache'];

/** Только папки кэша внутри профилей. Service Worker и IndexedDB хранят данные сайтов, их не трогаем. */
export function browserCache(...relativeUserData: string[]) {
  return async (env: CleanerEnv, fs: FileSystem): Promise<CleanPlan> => {
    const userData = path.join(env.local, ...relativeUserData);
    if ((await fs.kindOf(userData)) !== 'directory') return { unavailable: 'Браузер не найден' };
    const profiles = (await fs.readDir(userData)).filter(
      (entry) => entry.kind === 'directory' && PROFILE_DIR.test(entry.name),
    );
    return {
      specs: profiles.flatMap((profile) =>
        CACHE_DIRS.map((cache) => ({ path: path.join(userData, profile.name, cache) })),
      ),
    };
  };
}
