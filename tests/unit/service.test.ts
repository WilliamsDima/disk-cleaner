import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanerService } from '../../src/main/application/cleaner-service';
import type { CleanRule } from '../../src/main/domain/types';
import { cleanupReducer, initialState, type CleanupState } from '../../src/renderer/src/features/cleanup/model/reducer';
import { RULES } from '../../src/main/rules/catalog';
import { createSandbox, put, there } from './helpers';

let box: ReturnType<typeof createSandbox>;
beforeEach(() => {
  box = createSandbox();
});
afterEach(() => box.dispose());

function service(rules: CleanRule[] = RULES) {
  const emit = vi.fn();
  return { instance: new CleanerService(box.deps, rules, emit, async () => 'log.txt'), emit };
}

describe('CleanerService', () => {
  it('игнорирует неизвестные идентификаторы и не-массивы', async () => {
    const file = put(path.join(box.env.temp, 'old.tmp'), 30);
    const { instance } = service();
    expect((await instance.clean(['C:\\Windows', '../..', 42])).rows).toEqual([]);
    expect((await instance.clean('temp')).rows).toEqual([]);
    expect((await instance.clean(null)).rows).toEqual([]);
    expect(there(file)).toBe(true);
  });

  it('чистит только выбранные правила и суммирует результат', async () => {
    const tempFile = put(path.join(box.env.temp, 'old.tmp'), 30, 'abcd');
    const dump = put(path.join(box.env.local, 'CrashDumps', 'a.dmp'));
    const { instance } = service();
    const report = await instance.clean(['temp']);
    expect(there(tempFile)).toBe(false);
    expect(there(dump)).toBe(true);
    expect(report.freed).toBe(4);
    expect(report.logPath).toBe('log.txt');
  });

  it('не запускает две операции одновременно', async () => {
    const { instance } = service();
    const first = instance.scan();
    await expect(instance.clean(['temp'])).rejects.toThrow('другая операция');
    await first;
  });

  it('сбой журнала не отменяет результат чистки', async () => {
    const file = put(path.join(box.env.temp, 'old.tmp'), 30);
    const instance = new CleanerService(box.deps, RULES, vi.fn(), () => Promise.reject(new Error('нет места')));
    const report = await instance.clean(['temp']);
    expect(there(file)).toBe(false);
    expect(report.logPath).toBeNull();
  });
});

describe('выбор в интерфейсе', () => {
  const rule = (id: string, defaultSelected: boolean) => ({
    id,
    group: 'safe' as const,
    name: id,
    note: '',
    defaultSelected,
  });
  const row = (id: string, size: number, status: 'ok' | 'blocked' | 'unavailable' = 'ok') => ({
    id,
    status,
    reason: null,
    size,
    files: 1,
  });
  const scanned = (...rows: ReturnType<typeof row>[]): CleanupState => {
    let state = cleanupReducer(initialState, { type: 'rules-loaded', rules: [rule('a', true), rule('b', false)] });
    state = cleanupReducer(state, { type: 'scan-started' });
    for (const item of rows) state = cleanupReducer(state, { type: 'scan-row', row: item });
    return cleanupReducer(state, { type: 'scan-finished' });
  };

  it('отмечает по умолчанию только рекомендованное и непустое', () => {
    expect(scanned(row('a', 10), row('b', 10)).selected).toEqual(['a']);
    expect(scanned(row('a', 0), row('b', 10)).selected).toEqual([]);
  });

  it('заблокированное нельзя выбрать ни автоматически, ни вручную', () => {
    const state = scanned(row('a', 10, 'blocked'), row('b', 0));
    expect(state.selected).toEqual([]);
    expect(cleanupReducer(state, { type: 'toggle', id: 'a' }).selected).toEqual([]);
    expect(cleanupReducer(state, { type: 'toggle', id: 'b' }).selected).toEqual([]);
  });

  it('во время чистки выбор не меняется', () => {
    const state = cleanupReducer(scanned(row('a', 10), row('b', 10)), { type: 'clean-started' });
    expect(cleanupReducer(state, { type: 'toggle', id: 'b' }).selected).toEqual(['a']);
  });
});
