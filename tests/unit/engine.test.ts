import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRule, type EngineDeps } from '../../src/main/application/engine';
import { findBlockers, isAllowedRoot, isProtected } from '../../src/main/domain/safety';
import type { CleanRule } from '../../src/main/domain/types';
import { NodeFileSystem } from '../../src/main/infrastructure/node-file-system';
import { clean, createSandbox, junction, put, scan, there } from './helpers';

let box: ReturnType<typeof createSandbox>;
beforeEach(() => {
  box = createSandbox();
});
afterEach(() => box.dispose());

function customRule(specPath: string, blockedBy: string[] = []): CleanRule {
  return {
    id: 'custom',
    group: 'safe',
    name: 'custom',
    note: '',
    defaultSelected: false,
    blockedBy,
    resolve: () => Promise.resolve({ specs: [{ path: specPath }] }),
  };
}

describe('временные файлы', () => {
  it('подсчёт ничего не удаляет и считает то же, что удалится', async () => {
    const file = put(path.join(box.env.temp, 'old.tmp'), 30);
    put(path.join(box.env.temp, 'fresh.tmp'), 1);
    const outcome = await scan(box.deps, 'temp');
    expect(there(file)).toBe(true);
    expect(outcome.stats.files).toBe(1);
  });

  it('удаляет старое и оставляет свежее и исключённое', async () => {
    const old = put(path.join(box.env.temp, 'sub', 'old.tmp'), 30);
    const fresh = put(path.join(box.env.temp, 'fresh.tmp'), 1);
    const claude = put(path.join(box.env.temp, 'claude', 'old.tmp'), 30);
    const vscode = put(path.join(box.env.temp, 'vscode-stable-user-x64', 'old.tmp'), 30);
    await clean(box.deps, 'temp');
    expect(there(old)).toBe(false);
    expect(there(fresh)).toBe(true);
    expect(there(claude)).toBe(true);
    expect(there(vscode)).toBe(true);
  });

  it.each([
    'old.key',
    'id_rsa',
    '.env',
    'release.keystore',
    'Login Data',
    'Saved Games/slot1.dat',
    'x/SaveGames/a.dat',
  ])('не трогает %s', async (name) => {
    const file = put(path.join(box.env.temp, name), 30);
    const outcome = await clean(box.deps, 'temp');
    expect(there(file)).toBe(true);
    expect(outcome.stats.protectedCount).toBe(1);
  });

  it('не проходит через junction', async () => {
    const sentinel = put(path.join(box.root, 'Outside', 'sentinel.txt'), 30);
    junction(path.join(box.env.temp, 'link'), path.join(box.root, 'Outside'));
    const outcome = await clean(box.deps, 'temp');
    expect(there(sentinel)).toBe(true);
    expect(there(path.join(box.env.temp, 'link'))).toBe(true);
    expect(outcome.stats.links).toBe(1);
  });

  it('не чистит, если сам корень правила оказался ссылкой', async () => {
    const sentinel = put(path.join(box.root, 'Outside', 'sentinel.txt'));
    junction(path.join(box.env.local, 'CrashDumps'), path.join(box.root, 'Outside'));
    put(path.join(box.root, 'Outside', 'a.dmp'));
    await clean(box.deps, 'crash-dumps');
    expect(there(sentinel)).toBe(true);
    expect(there(path.join(box.root, 'Outside', 'a.dmp'))).toBe(true);
  });

  it('удаляет файлы только для чтения', async () => {
    const file = put(path.join(box.env.temp, 'ro.tmp'), 30);
    const { chmodSync } = await import('node:fs');
    chmodSync(file, 0o444);
    await clean(box.deps, 'temp');
    expect(there(file)).toBe(false);
  });

  it('занятый файл пропускается и не считается ошибкой', async () => {
    const file = put(path.join(box.env.temp, 'locked.tmp'), 30);
    const fs = new NodeFileSystem();
    fs.deleteFile = () => Promise.reject(Object.assign(new Error('busy'), { code: 'EBUSY' }));
    const outcome = await clean({ ...box.deps, fs }, 'temp');
    expect(there(file)).toBe(true);
    expect(outcome.stats.locked).toBe(1);
    expect(outcome.stats.errors).toEqual([]);
  });
});

describe('рубежи защиты', () => {
  it('отклоняет корни вне разрешённых папок', async () => {
    const outside = put(path.join(box.root, 'Elsewhere', 'file.bin'));
    for (const target of [
      path.dirname(outside),
      box.env.local,
      box.env.home,
      box.root,
      'C:\\',
      `${box.env.local}\\..\\Elsewhere`,
    ]) {
      const outcome = await runRule(box.deps, customRule(target), true);
      expect(outcome.stats.errors).toHaveLength(1);
      expect(outcome.stats.deleted).toBe(0);
    }
    expect(there(outside)).toBe(true);
  });

  it('разрешает только внутри разрешённых папок', () => {
    expect(isAllowedRoot(path.join(box.env.local, 'x'), box.env)).toBe(true);
    expect(isAllowedRoot(path.join(box.env.home, '.gradle', 'caches'), box.env)).toBe(true);
    expect(isAllowedRoot(path.join(box.env.home, 'Downloads'), box.env)).toBe(false);
    expect(isAllowedRoot(`${box.env.local}-evil\\x`, box.env)).toBe(false);
  });

  it('узнаёт защищённые пути', () => {
    expect(isProtected('C:\\Users\\a\\Documents\\x.txt')).toBe(true);
    expect(isProtected('C:\\x\\Cookies-journal')).toBe(true);
    expect(isProtected('C:\\x\\cache.bin')).toBe(false);
  });

  it('запущенная программа блокирует чистку', async () => {
    const file = put(path.join(box.env.local, 'Thing', 'a.bin'));
    const deps: EngineDeps = { ...box.deps, listProcesses: async () => ['CapCut.exe'] };
    const outcome = await runRule(deps, customRule(path.dirname(file), ['CapCut*']), true);
    expect(outcome.status).toBe('blocked');
    expect(there(file)).toBe(true);
  });

  it('если список процессов получить не удалось, чистка не идёт', async () => {
    const file = put(path.join(box.env.local, 'Thing', 'a.bin'));
    const deps: EngineDeps = { ...box.deps, listProcesses: () => Promise.reject(new Error('нет')) };
    const outcome = await runRule(deps, customRule(path.dirname(file)), true);
    expect(outcome.status).toBe('blocked');
    expect(there(file)).toBe(true);
  });

  it('упавшее правило становится недоступным', async () => {
    const broken: CleanRule = { ...customRule('x'), resolve: () => Promise.reject(new Error('boom')) };
    const outcome = await runRule(box.deps, broken, true);
    expect(outcome.status).toBe('unavailable');
  });

  it('сравнивает имена процессов точно, а не по подстроке', () => {
    expect(findBlockers(['chrome'], ['chrome.exe'])).toEqual(['chrome']);
    expect(findBlockers(['chrome'], ['chromedriver.exe'])).toEqual([]);
    expect(findBlockers(['msedge'], ['msedgewebview2.exe'])).toEqual([]);
    expect(findBlockers(['CapCut*'], ['CapCutService.exe'])).toEqual(['capcutservice']);
  });
});
