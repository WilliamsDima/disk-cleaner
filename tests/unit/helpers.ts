import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { EngineDeps } from '../../src/main/application/engine';
import { runRule } from '../../src/main/application/engine';
import type { CleanRule } from '../../src/main/domain/types';
import { NodeFileSystem } from '../../src/main/infrastructure/node-file-system';
import { createSandboxEnv } from '../../src/main/infrastructure/system';
import { RULES } from '../../src/main/rules/catalog';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createSandbox() {
  const root = mkdtempSync(path.join(tmpdir(), 'disk-cleaner-test-'));
  const env = createSandboxEnv(root);
  const deps: EngineDeps = { env, fs: new NodeFileSystem(), listProcesses: async () => ['explorer.exe'] };
  return { root, env, deps, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

export function put(file: string, ageDays = 0, content = 'data'): string {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  const when = new Date(Date.now() - ageDays * DAY_MS);
  utimesSync(file, when, when);
  return file;
}

export const there = existsSync;

export function junction(link: string, target: string): void {
  mkdirSync(path.dirname(link), { recursive: true });
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', link, target], { stdio: 'ignore' });
}

export function rule(id: string): CleanRule {
  const found = RULES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Нет правила ${id}`);
  return found;
}

export function clean(deps: EngineDeps, id: string) {
  return runRule(deps, rule(id), true);
}

export function scan(deps: EngineDeps, id: string) {
  return runRule(deps, rule(id), false);
}
