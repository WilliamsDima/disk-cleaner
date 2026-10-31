import { memo, useMemo } from 'react';
import type { CleanReport } from '../../../../../shared/contract';
import { formatSize } from '../../../shared/lib/format';
import { Modal } from './Modal';
import styles from './cleanup.module.css';

interface Props {
  report: CleanReport;
  onClose: () => void;
  onOpenLog: () => void;
}

export const ResultDialog = memo(function ResultDialog({ report, onClose, onOpenLog }: Props) {
  const freedText = useMemo(() => formatSize(report.freed), [report.freed]);
  const locked = useMemo(() => report.rows.reduce((sum, row) => sum + row.locked, 0), [report.rows]);
  const errors = useMemo(() => report.rows.reduce((sum, row) => sum + row.errors.length, 0), [report.rows]);
  const skipped = useMemo(() => report.rows.filter((row) => row.status !== 'ok'), [report.rows]);
  const hasLog = useMemo(() => report.logPath !== null, [report.logPath]);

  return (
    <Modal title="Готово" onClose={onClose}>
      <p className={styles.resultValue} data-testid="result-freed">
        {freedText}
        <span className={styles.resultCaption}>освобождено</span>
      </p>
      {locked > 0 && (
        <p className={styles.resultNote}>Пропущено занятых файлов: {locked}. Их сейчас использует другая программа.</p>
      )}
      {skipped.map((row) => (
        <p key={row.id} className={styles.resultNote}>
          Не чистилось: {row.name}. {row.reason}
        </p>
      ))}
      {errors > 0 && <p className={styles.resultWarning}>Не удалось обработать: {errors}. Подробности в журнале.</p>}
      <div className={styles.modalActions}>
        {hasLog && (
          <button className={styles.buttonGhost} type="button" onClick={onOpenLog}>
            Открыть журнал
          </button>
        )}
        <button className={styles.buttonPrimary} type="button" autoFocus onClick={onClose}>
          Закрыть
        </button>
      </div>
    </Modal>
  );
});
