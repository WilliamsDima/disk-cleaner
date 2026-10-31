import { execFile } from 'node:child_process';
import { promises as fsp, existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { CleanRow, DiskInfo } from '../../shared/contract';
import type { CleanerEnv } from '../domain/types';

const execFileAsync = promisify(execFile);

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

export function createSandboxEnv(root: string): CleanerEnv {
  return {
    local: path.join(root, 'Local'),
    roaming: path.join(root, 'Roaming'),
    home: path.join(root, 'Home'),
    temp: path.join(root, 'Local', 'Temp'),
    sdk: path.join(root, 'Local', 'Android', 'Sdk'),
    avdHome: path.join(root, 'Home', '.android', 'avd'),
  };
}

export function createSystemEnv(): CleanerEnv {
  const local = required('LOCALAPPDATA');
  const home = required('USERPROFILE');
  const sdkCandidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
  const sdk =
    sdkCandidates.find((candidate) => candidate && existsSync(candidate)) ?? path.join(local, 'Android', 'Sdk');
  const avdHome =
    process.env.ANDROID_AVD_HOME ??
    (process.env.ANDROID_USER_HOME
      ? path.join(process.env.ANDROID_USER_HOME, 'avd')
      : path.join(home, '.android', 'avd'));
  return { local, roaming: required('APPDATA'), home, temp: path.join(local, 'Temp'), sdk, avdHome };
}

export async function listProcesses(): Promise<string[]> {
  const { stdout } = await execFileAsync('tasklist.exe', ['/FO', 'CSV', '/NH'], {
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  const names = [...stdout.matchAll(/^"([^"]+)"/gm)].map((match) => match[1] ?? '');
  if (names.length === 0) throw new Error('tasklist вернул пустой список');
  return names;
}

export async function readDisk(drive = 'C:\\'): Promise<DiskInfo> {
  const stats = await fsp.statfs(drive);
  return { drive: drive.slice(0, 1), total: stats.blocks * stats.bsize, free: stats.bavail * stats.bsize };
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function createReportWriter(logDir: string) {
  return async (rows: CleanRow[]): Promise<string> => {
    await fsp.mkdir(logDir, { recursive: true });
    const lines = rows.flatMap((row) => [
      `${row.name}: освобождено ${formatMb(row.freed)}, файлов ${row.deleted}, занято ${row.locked}, под защитой ${row.protectedCount}, ссылок ${row.links}`,
      ...(row.reason ? [`  пропущено: ${row.reason}`] : []),
      ...row.errors.map((message) => `  ${message}`),
    ]);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(logDir, `${stamp}.txt`);
    await fsp.writeFile(file, `\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
    return file;
  };
}
