import { writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RULES } from '../../src/main/rules/catalog';
import { clean, createSandbox, put, scan, there } from './helpers';

let box: ReturnType<typeof createSandbox>;
beforeEach(() => {
  box = createSandbox();
});
afterEach(() => box.dispose());

describe('каталог', () => {
  it('идентификаторы уникальны, у каждого правила есть объяснение', () => {
    expect(new Set(RULES.map((rule) => rule.id)).size).toBe(RULES.length);
    for (const rule of RULES) expect(rule.note.length).toBeGreaterThan(0);
  });

  it('правила, замедляющие работу, не выбраны по умолчанию', () => {
    for (const rule of RULES.filter((candidate) => candidate.group === 'slow')) {
      expect(rule.defaultSelected).toBe(false);
    }
  });
});

describe('образы Android', () => {
  const avdConfig = () => path.join(box.env.avdHome, 'Pixel.avd', 'config.ini');
  const image = (...parts: string[]) => path.join(box.env.sdk, 'system-images', ...parts, 'system.img');

  beforeEach(() => {
    put(image('android-37.0', 'google_apis', 'x86_64'));
    put(image('android-37.0', 'default', 'x86_64'));
    put(image('android-35', 'google_apis', 'x86_64'));
    put(avdConfig(), 0, 'image.sysdir.1=system-images\\android-37.0\\google_apis\\x86_64\\\nhw.ramSize=2048\n');
  });

  it('оставляет используемый образ и удаляет остальные вместе с пустыми родителями', async () => {
    await clean(box.deps, 'android-images');
    expect(there(image('android-37.0', 'google_apis', 'x86_64'))).toBe(true);
    expect(there(path.join(box.env.sdk, 'system-images', 'android-37.0', 'default'))).toBe(false);
    expect(there(path.join(box.env.sdk, 'system-images', 'android-35'))).toBe(false);
    expect(there(path.join(box.env.sdk, 'system-images'))).toBe(true);
  });

  it('понимает прямые слеши и другой регистр в настройках', async () => {
    writeFileSync(avdConfig(), 'image.sysdir.1=System-Images/android-37.0/GOOGLE_APIS/x86_64/\n');
    await clean(box.deps, 'android-images');
    expect(there(image('android-37.0', 'google_apis', 'x86_64'))).toBe(true);
  });

  it('учитывает эмулятор, лежащий вне папки avd, через .ini', async () => {
    const external = path.join(box.root, 'ExternalAvd');
    put(path.join(external, 'config.ini'), 0, 'image.sysdir.1=system-images\\android-35\\google_apis\\x86_64\\\n');
    put(path.join(box.env.avdHome, 'External.ini'), 0, `path=${external}\n`);
    await clean(box.deps, 'android-images');
    expect(there(image('android-35', 'google_apis', 'x86_64'))).toBe(true);
    expect(there(image('android-37.0', 'default', 'x86_64'))).toBe(false);
  });

  it('устаревший .ini на удалённый эмулятор не мешает', async () => {
    put(path.join(box.env.avdHome, 'Gone.ini'), 0, `path=${path.join(box.root, 'Gone')}\n`);
    const outcome = await clean(box.deps, 'android-images');
    expect(outcome.status).toBe('ok');
  });

  it.each([
    ['в настройках нет образа', 'hw.ramSize=2048\n'],
    ['непонятный образ', 'image.sysdir.1=somewhere\\else\n'],
  ])('ничего не удаляет: %s', async (_title, content) => {
    writeFileSync(avdConfig(), content);
    const outcome = await clean(box.deps, 'android-images');
    expect(outcome.status).toBe('unavailable');
    expect(there(image('android-35', 'google_apis', 'x86_64'))).toBe(true);
  });

  it('ничего не удаляет, если нет файла настроек', async () => {
    rmSync(avdConfig());
    const outcome = await clean(box.deps, 'android-images');
    expect(outcome.status).toBe('unavailable');
    expect(there(image('android-35', 'google_apis', 'x86_64'))).toBe(true);
  });

  it('ничего не удаляет, если эмуляторов нет', async () => {
    rmSync(path.dirname(avdConfig()), { recursive: true });
    const outcome = await clean(box.deps, 'android-images');
    expect(outcome.status).toBe('unavailable');
    expect(there(image('android-35', 'google_apis', 'x86_64'))).toBe(true);
  });
});

describe('CapCut', () => {
  const apps = () => path.join(box.env.local, 'CapCut', 'Apps');
  const exe = (version: string) => path.join(apps(), version, 'CapCut.exe');

  it('сравнивает версии как числа: 9.10 новее 9.3', async () => {
    for (const version of ['8.5.0.1', '9.3.0.1', '9.10.0.1', '9.2.0.1']) put(exe(version));
    const launcher = put(path.join(apps(), 'CapCut.exe'));
    await clean(box.deps, 'capcut-versions');
    expect(there(exe('9.10.0.1'))).toBe(true);
    expect(there(exe('9.3.0.1'))).toBe(true);
    expect(there(path.join(apps(), '9.2.0.1'))).toBe(false);
    expect(there(path.join(apps(), '8.5.0.1'))).toBe(false);
    expect(there(launcher)).toBe(true);
  });

  it('оставляет версию из ProductInfo.xml', async () => {
    for (const version of ['7.0.0.1', '7.1.0.1', '7.2.0.1', '7.3.0.1']) put(exe(version));
    put(path.join(apps(), 'ProductInfo.xml'), 0, '<full_appver value="7.0.0.1" />');
    await clean(box.deps, 'capcut-versions');
    expect(there(exe('7.0.0.1'))).toBe(true);
    expect(there(path.join(apps(), '7.1.0.1'))).toBe(false);
  });

  it('не удаляет старые версии, если новейшая битая', async () => {
    put(path.join(apps(), '9.0.0.1', 'other.dll'));
    put(exe('8.0.0.1'));
    put(exe('7.0.0.1'));
    const outcome = await clean(box.deps, 'capcut-versions');
    expect(outcome.status).toBe('unavailable');
    expect(there(exe('7.0.0.1'))).toBe(true);
  });

  it('чистит только перечисленный кэш, проекты остаются', async () => {
    const cache = path.join(box.env.local, 'CapCut', 'User Data', 'Cache');
    const smart = put(path.join(cache, 'SmartCrop', 'a.bin'));
    const cloud = put(path.join(cache, 'cloudDraft', 'keep.bin'));
    const project = put(path.join(box.env.local, 'CapCut', 'User Data', 'Projects', 'p1', 'draft.json'));
    await clean(box.deps, 'capcut-cache');
    expect(there(smart)).toBe(false);
    expect(there(cloud)).toBe(true);
    expect(there(project)).toBe(true);
  });
});

describe('шейдеры', () => {
  it('старые и свежие правила не пересекаются', async () => {
    const dx = path.join(box.env.local, 'NVIDIA', 'DXCache');
    const old = put(path.join(dx, 'old.nvph'), 90);
    const fresh = put(path.join(dx, 'new.nvph'), 5);
    expect((await scan(box.deps, 'shaders-old')).stats.files).toBe(1);
    expect((await scan(box.deps, 'shaders-new')).stats.files).toBe(1);
    await clean(box.deps, 'shaders-old');
    expect(there(old)).toBe(false);
    expect(there(fresh)).toBe(true);
  });
});

describe('браузер', () => {
  it('удаляет только кэш, данные пользователя остаются', async () => {
    const userData = path.join(box.env.local, 'Google', 'Chrome', 'User Data');
    const removed = [
      put(path.join(userData, 'Default', 'Cache', 'Cache_Data', 'f_1')),
      put(path.join(userData, 'Default', 'Code Cache', 'js', 'a')),
      put(path.join(userData, 'Profile 1', 'GPUCache', 'data_0')),
    ];
    const kept = [
      put(path.join(userData, 'Default', 'Login Data')),
      put(path.join(userData, 'Default', 'Cookies')),
      put(path.join(userData, 'Default', 'Preferences')),
      put(path.join(userData, 'Default', 'Service Worker', 'sw.bin')),
      put(path.join(userData, 'Default', 'IndexedDB', 'db.bin')),
      put(path.join(userData, 'Local State')),
      put(path.join(userData, 'Profile 1', 'Login Data')),
      put(path.join(userData, 'Default', 'Cache', 'Login Data')),
      put(path.join(userData, 'System Profile', 'Cache', 'x')),
    ];
    await clean(box.deps, 'chrome');
    for (const file of removed) expect(there(file), file).toBe(false);
    for (const file of kept) expect(there(file), file).toBe(true);
  });
});
