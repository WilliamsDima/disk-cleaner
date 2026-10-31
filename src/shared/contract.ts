// Контракт между главным процессом и интерфейсом.
// Интерфейс передаёт только идентификаторы правил, пути в контракт намеренно не входят.

export type RuleGroup = 'safe' | 'slow';

export interface RuleView {
  id: string;
  group: RuleGroup;
  name: string;
  note: string;
  defaultSelected: boolean;
}

export type RuleStatus = 'ok' | 'unavailable' | 'blocked';

export interface ScanRow {
  id: string;
  status: RuleStatus;
  reason: string | null;
  size: number;
  files: number;
}

export interface CleanRow {
  id: string;
  name: string;
  status: RuleStatus;
  reason: string | null;
  freed: number;
  deleted: number;
  locked: number;
  protectedCount: number;
  links: number;
  errors: string[];
}

export interface CleanReport {
  rows: CleanRow[];
  freed: number;
  logPath: string | null;
}

export interface DiskInfo {
  drive: string;
  total: number;
  free: number;
}

export type ProgressEvent = { kind: 'scan-row'; row: ScanRow } | { kind: 'clean-start'; id: string; name: string };

export interface CleanerApi {
  listRules(): Promise<RuleView[]>;
  getDisk(): Promise<DiskInfo>;
  scan(): Promise<ScanRow[]>;
  clean(ids: string[]): Promise<CleanReport>;
  openLog(): Promise<void>;
  onProgress(listener: (event: ProgressEvent) => void): () => void;
}

export const IpcChannel = {
  ListRules: 'cleaner:list-rules',
  GetDisk: 'cleaner:get-disk',
  Scan: 'cleaner:scan',
  Clean: 'cleaner:clean',
  OpenLog: 'cleaner:open-log',
  Progress: 'cleaner:progress',
} as const;
