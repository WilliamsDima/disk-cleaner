import type { RuleGroup } from '../../shared/contract';

/** Папки, от которых считаются все пути. В тестах указывают на песочницу. */
export interface CleanerEnv {
  local: string;
  roaming: string;
  home: string;
  temp: string;
  sdk: string;
  avdHome: string;
}

/** Что именно чистить в одной папке. */
export interface CleanSpec {
  path: string;
  /** Не трогать файлы моложе этого возраста. */
  minAgeDays?: number;
  /** Трогать только файлы моложе этого возраста. */
  newerThanDays?: number;
  /** Проверяется по пути относительно path. */
  exclude?: RegExp;
  /** Проверяется по имени файла; папки при этом не удаляются. */
  include?: RegExp;
  /** Удалить саму папку, если после чистки она опустела. */
  removeRoot?: boolean;
  /** Подняться вверх и удалить опустевших родителей вплоть до этой папки, не включая её. */
  pruneUpTo?: string;
}

export type CleanPlan = { specs: CleanSpec[] } | { unavailable: string };

export interface CleanRule {
  id: string;
  group: RuleGroup;
  name: string;
  note: string;
  defaultSelected: boolean;
  /** Пока запущена одна из этих программ, правило не чистит. Допускается * в конце имени. */
  blockedBy: string[];
  resolve(env: CleanerEnv, fs: FileSystem): Promise<CleanPlan>;
}

export interface WalkStats {
  size: number;
  files: number;
  freed: number;
  deleted: number;
  locked: number;
  protectedCount: number;
  links: number;
  errors: string[];
}

export type EntryKind = 'file' | 'directory' | 'link' | 'other';

export interface DirEntryInfo {
  name: string;
  kind: EntryKind;
}

export interface FileInfo {
  size: number;
  mtimeMs: number;
}

/** Порт к файловой системе. Ссылки не проходятся: stat и readDir их не разворачивают. */
export interface FileSystem {
  readDir(path: string): Promise<DirEntryInfo[]>;
  stat(path: string): Promise<FileInfo>;
  kindOf(path: string): Promise<EntryKind | null>;
  readText(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  /** Только пустую папку. Рекурсивного удаления в порте нет намеренно. */
  deleteEmptyDir(path: string): Promise<void>;
}

export type ProcessLister = () => Promise<string[]>;
