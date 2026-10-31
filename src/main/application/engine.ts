import path from 'node:path';
import { findBlockers, isAllowedRoot, isProtected } from '../domain/safety';
import type { CleanRule, CleanSpec, CleanerEnv, FileSystem, ProcessLister, WalkStats } from '../domain/types';
import type { RuleStatus } from '../../shared/contract';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCKED_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

export interface EngineDeps {
  env: CleanerEnv;
  fs: FileSystem;
  listProcesses: ProcessLister;
}

export interface RuleOutcome {
  status: RuleStatus;
  reason: string | null;
  stats: WalkStats;
}

export function emptyStats(): WalkStats {
  return { size: 0, files: 0, freed: 0, deleted: 0, locked: 0, protectedCount: 0, links: 0, errors: [] };
}

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | undefined)?.code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function tryDeleteEmptyDir(fs: FileSystem, target: string): Promise<boolean> {
  try {
    await fs.deleteEmptyDir(target);
    return true;
  } catch {
    // Папка не пуста или занята: это штатная ситуация.
    return false;
  }
}

async function walk(
  deps: EngineDeps,
  dir: string,
  spec: CleanSpec,
  stats: WalkStats,
  remove: boolean,
  rootLength: number,
): Promise<void> {
  let entries;
  try {
    entries = await deps.fs.readDir(dir);
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') stats.errors.push(`${dir}: ${errorMessage(error)}`);
    return;
  }

  const minAge = spec.minAgeDays ?? 0;
  for (const entry of entries) {
    if (entry.kind === 'link' || entry.kind === 'other') {
      stats.links += 1;
      continue;
    }
    const full = path.join(dir, entry.name);
    const relative = full.slice(rootLength + 1);
    if (spec.exclude?.test(relative)) continue;
    if (isProtected(full)) {
      stats.protectedCount += 1;
      continue;
    }

    let info;
    try {
      info = await deps.fs.stat(full);
    } catch {
      continue;
    }
    const ageDays = (Date.now() - info.mtimeMs) / DAY_MS;

    if (entry.kind === 'directory') {
      await walk(deps, full, spec, stats, remove, rootLength);
      if (remove && ageDays >= minAge && !spec.include) await tryDeleteEmptyDir(deps.fs, full);
      continue;
    }

    if (spec.include && !spec.include.test(entry.name)) continue;
    if (ageDays < minAge) continue;
    if (spec.newerThanDays !== undefined && ageDays >= spec.newerThanDays) continue;

    if (!remove) {
      stats.size += info.size;
      stats.files += 1;
      continue;
    }
    try {
      await deps.fs.deleteFile(full);
      stats.freed += info.size;
      stats.deleted += 1;
    } catch (error) {
      const code = errorCode(error);
      if (code === 'ENOENT') continue;
      if (code !== undefined && LOCKED_CODES.has(code)) stats.locked += 1;
      else stats.errors.push(`${full}: ${errorMessage(error)}`);
    }
  }
}

async function runSpec(deps: EngineDeps, spec: CleanSpec, stats: WalkStats, remove: boolean): Promise<void> {
  const root = path.resolve(spec.path);
  if (!isAllowedRoot(root, deps.env)) {
    stats.errors.push(`Путь вне разрешённых папок, пропущен: ${root}`);
    return;
  }
  const kind = await deps.fs.kindOf(root);
  if (kind === 'link') {
    stats.links += 1;
    return;
  }
  if (kind !== 'directory') return;

  await walk(deps, root, spec, stats, remove, root.length);
  if (!remove || !spec.removeRoot) return;
  if (!(await tryDeleteEmptyDir(deps.fs, root))) return;
  if (!spec.pruneUpTo) return;

  const stop = path.resolve(spec.pruneUpTo).toLowerCase();
  let parent = path.dirname(root);
  while (parent.toLowerCase().startsWith(stop + path.sep) && (await tryDeleteEmptyDir(deps.fs, parent))) {
    parent = path.dirname(parent);
  }
}

/**
 * Один проход и для подсчёта, и для чистки, поэтому размер в окне соответствует удаляемому.
 * План строится заново при каждом вызове: результатам прошлого подсчёта не доверяем.
 */
export async function runRule(deps: EngineDeps, rule: CleanRule, remove: boolean): Promise<RuleOutcome> {
  const stats = emptyStats();

  let running: string[];
  try {
    running = await deps.listProcesses();
  } catch (error) {
    return { status: 'blocked', reason: `Не удалось проверить запущенные программы: ${errorMessage(error)}`, stats };
  }
  const blockers = findBlockers(rule.blockedBy, running);
  if (blockers.length > 0) {
    return {
      status: 'blocked',
      reason: `Сейчас запущено: ${blockers.join(', ')}. Закрой и нажми «Пересчитать».`,
      stats,
    };
  }

  let plan;
  try {
    plan = await rule.resolve(deps.env, deps.fs);
  } catch (error) {
    return { status: 'unavailable', reason: `Не удалось разобрать: ${errorMessage(error)}`, stats };
  }
  if ('unavailable' in plan) return { status: 'unavailable', reason: plan.unavailable, stats };

  for (const spec of plan.specs) await runSpec(deps, spec, stats, remove);
  return { status: 'ok', reason: null, stats };
}
