import type { CleanReport, CleanRow, ProgressEvent, RuleView, ScanRow } from '../../shared/contract';
import type { CleanRule } from '../domain/types';
import { runRule, type EngineDeps } from './engine';

export type ProgressSink = (event: ProgressEvent) => void;
export type ReportWriter = (rows: CleanRow[]) => Promise<string | null>;

/** Сценарии приложения. Одновременно выполняется только один подсчёт или одна чистка. */
export class CleanerService {
  private busy = false;

  constructor(
    private readonly deps: EngineDeps,
    private readonly rules: CleanRule[],
    private readonly emit: ProgressSink,
    private readonly writeReport: ReportWriter,
  ) {}

  listRules(): RuleView[] {
    return this.rules.map(({ id, group, name, note, defaultSelected }) => ({ id, group, name, note, defaultSelected }));
  }

  scan(): Promise<ScanRow[]> {
    return this.exclusive(() =>
      Promise.all(
        this.rules.map(async (rule) => {
          const outcome = await runRule(this.deps, rule, false);
          const row: ScanRow = {
            id: rule.id,
            status: outcome.status,
            reason: outcome.reason,
            size: outcome.stats.size,
            files: outcome.stats.files,
          };
          this.emit({ kind: 'scan-row', row });
          return row;
        }),
      ),
    );
  }

  /** Неизвестные идентификаторы отбрасываются: удалить можно только то, что есть в каталоге правил. */
  clean(ids: unknown): Promise<CleanReport> {
    const wanted = new Set(Array.isArray(ids) ? ids : []);
    const selected = this.rules.filter((rule) => wanted.has(rule.id));
    return this.exclusive(async () => {
      const rows: CleanRow[] = [];
      for (const rule of selected) {
        this.emit({ kind: 'clean-start', id: rule.id, name: rule.name });
        const { status, reason, stats } = await runRule(this.deps, rule, true);
        rows.push({
          id: rule.id,
          name: rule.name,
          status,
          reason,
          freed: stats.freed,
          deleted: stats.deleted,
          locked: stats.locked,
          protectedCount: stats.protectedCount,
          links: stats.links,
          errors: stats.errors,
        });
      }
      let logPath: string | null = null;
      try {
        logPath = await this.writeReport(rows);
      } catch {
        // Журнал не должен мешать результату чистки.
      }
      return { rows, freed: rows.reduce((sum, row) => sum + row.freed, 0), logPath };
    });
  }

  private async exclusive<T>(job: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error('Уже выполняется другая операция');
    this.busy = true;
    try {
      return await job();
    } finally {
      this.busy = false;
    }
  }
}
