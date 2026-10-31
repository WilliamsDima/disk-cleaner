import path from 'node:path';
import type { CleanerEnv } from './types';

// Последний рубеж защиты: срабатывает даже при ошибке в правиле.

const PROTECTED_SEGMENTS = /\\(Saved Games|SaveGames?|Saved|Saves?|\.ssh|\.gnupg|Documents|Desktop|OneDrive)(\\|$)/i;

const PROTECTED_NAMES = new RegExp(
  [
    '^(Login Data|Login Data For Account|Cookies|Web Data|Local State|Preferences|Secure Preferences)$',
    '^(Login Data|Cookies)-',
    '\\.(key|pem|pfx|p12|jks|keystore|kdbx|ppk|asc|gpg|sav|save)$',
    '^\\.env',
    '^id_(rsa|ed25519|ecdsa|dsa)',
  ].join('|'),
  'i',
);

export function isProtected(fullPath: string): boolean {
  return PROTECTED_SEGMENTS.test(fullPath) || PROTECTED_NAMES.test(path.basename(fullPath));
}

/** Корень чистки обязан лежать строго внутри разрешённой папки, сама она не подходит. */
export function isAllowedRoot(target: string, env: CleanerEnv): boolean {
  const resolved = path.resolve(target).toLowerCase();
  const bases = [env.local, env.roaming, path.join(env.home, '.gradle'), path.join(env.sdk, 'system-images')];
  return bases.some((base) => {
    const prefix = path.resolve(base).toLowerCase() + path.sep;
    return resolved.startsWith(prefix) && resolved.length > prefix.length;
  });
}

export function findBlockers(patterns: string[], running: string[]): string[] {
  const names = new Set(running.map((name) => name.toLowerCase().replace(/\.exe$/, '')));
  const found = new Set<string>();
  for (const pattern of patterns) {
    const lowered = pattern.toLowerCase();
    const prefix = lowered.endsWith('*') ? lowered.slice(0, -1) : null;
    for (const name of names) {
      if (prefix === null ? name === lowered : name.startsWith(prefix)) found.add(name);
    }
  }
  return [...found].sort();
}
