import path from 'node:path';
import type { CleanRule, CleanSpec } from '../domain/types';
import { resolveAndroidImages } from './android-images';
import { browserCache } from './browser';
import { resolveCapCutCache, resolveCapCutVersions } from './capcut';

const BROWSER_NOTE = 'Сайты первое время будут открываться дольше. Пароли, куки и история не затрагиваются.';
const PACKAGES_NOTE = 'Следующая установка пакетов скачает их заново. Сами проекты не затрагиваются.';

function specs(...list: CleanSpec[]) {
  return Promise.resolve({ specs: list });
}

/** Единственный источник того, что приложение вообще может удалить. */
export const RULES: CleanRule[] = [
  {
    id: 'android-images',
    group: 'safe',
    defaultSelected: true,
    blockedBy: ['emulator', 'qemu-system-*', 'studio64'],
    name: 'Образы эмуляторов Android, которые не используются',
    note: 'Образы, на которых работают твои эмуляторы, остаются. Остальные можно снова скачать через SDK Manager.',
    resolve: resolveAndroidImages,
  },
  {
    id: 'capcut-versions',
    group: 'safe',
    defaultSelected: true,
    blockedBy: ['CapCut*'],
    name: 'CapCut: старые версии',
    note: 'Текущая и предыдущая версии остаются, проекты не затрагиваются.',
    resolve: resolveCapCutVersions,
  },
  {
    id: 'capcut-cache',
    group: 'safe',
    defaultSelected: true,
    blockedBy: ['CapCut*'],
    name: 'CapCut: кэш',
    note: 'Автокадрирование, миниатюры, распознавание. Создастся заново, проекты не затрагиваются.',
    resolve: resolveCapCutCache,
  },
  {
    id: 'shaders-old',
    group: 'safe',
    defaultSelected: true,
    blockedBy: [],
    name: 'Кэш шейдеров NVIDIA старше 60 дней',
    note: 'В давно не запускавшихся играх шейдеры при первом запуске соберутся заново.',
    resolve: (env) => specs({ path: path.join(env.local, 'NVIDIA', 'DXCache'), minAgeDays: 60 }),
  },
  {
    id: 'temp',
    group: 'safe',
    defaultSelected: true,
    blockedBy: [],
    name: 'Временные файлы старше 14 дней',
    note: 'Свежие файлы и рабочие папки Claude и VS Code не трогаются.',
    resolve: (env) => specs({ path: env.temp, minAgeDays: 14, exclude: /^(claude|vscode-stable)/i }),
  },
  {
    id: 'crash-dumps',
    group: 'safe',
    defaultSelected: true,
    blockedBy: [],
    name: 'Дампы сбоев программ',
    note: 'Нужны только для разбора вылетов, программы от них не зависят.',
    resolve: (env) => specs({ path: path.join(env.local, 'CrashDumps'), include: /\.dmp$/i }),
  },
  {
    id: 'vscode-vsix',
    group: 'safe',
    defaultSelected: true,
    blockedBy: [],
    name: 'VS Code: старые установщики расширений',
    note: 'Установленные расширения остаются, откат на старую версию скачает её заново.',
    resolve: (env) => specs({ path: path.join(env.roaming, 'Code', 'CachedExtensionVSIXs'), minAgeDays: 14 }),
  },
  {
    id: 'shaders-new',
    group: 'slow',
    defaultSelected: false,
    blockedBy: [],
    name: 'Кэш шейдеров NVIDIA за последние 60 дней',
    note: 'В играх, в которые играешь сейчас, вернутся подвисания и долгая сборка шейдеров при запуске.',
    resolve: (env) => specs({ path: path.join(env.local, 'NVIDIA', 'DXCache'), newerThanDays: 60 }),
  },
  {
    id: 'd3d-cache',
    group: 'slow',
    defaultSelected: false,
    blockedBy: [],
    name: 'Кэш шейдеров DirectX',
    note: 'Windows соберёт его заново, игры первое время могут запускаться дольше.',
    resolve: (env) => specs({ path: path.join(env.local, 'D3DSCache') }),
  },
  {
    id: 'gradle',
    group: 'slow',
    defaultSelected: false,
    blockedBy: ['java'],
    name: 'Кэш Gradle',
    note: 'Следующая сборка мобильного приложения заново всё скачает и будет заметно дольше.',
    resolve: (env) => specs({ path: path.join(env.home, '.gradle', 'caches') }),
  },
  {
    id: 'npm',
    group: 'slow',
    defaultSelected: false,
    blockedBy: [],
    name: 'Кэш npm',
    note: PACKAGES_NOTE,
    resolve: (env) => specs({ path: path.join(env.local, 'npm-cache', '_cacache') }),
  },
  {
    id: 'yarn',
    group: 'slow',
    defaultSelected: false,
    blockedBy: [],
    name: 'Кэш Yarn',
    note: PACKAGES_NOTE,
    resolve: (env) =>
      specs({ path: path.join(env.local, 'Yarn', 'Cache') }, { path: path.join(env.local, 'Yarn', 'Berry', 'cache') }),
  },
  {
    id: 'chrome',
    group: 'slow',
    defaultSelected: false,
    blockedBy: ['chrome'],
    name: 'Chrome: кэш страниц',
    note: BROWSER_NOTE,
    resolve: browserCache('Google', 'Chrome', 'User Data'),
  },
  {
    id: 'yandex',
    group: 'slow',
    defaultSelected: false,
    blockedBy: ['browser'],
    name: 'Яндекс Браузер: кэш страниц',
    note: BROWSER_NOTE,
    resolve: browserCache('Yandex', 'YandexBrowser', 'User Data'),
  },
  {
    id: 'edge',
    group: 'slow',
    defaultSelected: false,
    blockedBy: ['msedge'],
    name: 'Edge: кэш страниц',
    note: BROWSER_NOTE,
    resolve: browserCache('Microsoft', 'Edge', 'User Data'),
  },
];
