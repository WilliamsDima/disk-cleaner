import { memo, useMemo } from 'react';
import type { DiskInfo } from '../../../../../shared/contract';
import { formatSize } from '../../../shared/lib/format';
import styles from './cleanup.module.css';

interface Props {
  disk: DiskInfo | null;
  reclaimable: number;
}

export const DiskOverview = memo(function DiskOverview({ disk, reclaimable }: Props) {
  const freeText = useMemo(() => (disk ? formatSize(disk.free) : '…'), [disk]);
  const totalText = useMemo(() => (disk ? formatSize(disk.total) : '…'), [disk]);
  const afterText = useMemo(() => (disk ? formatSize(disk.free + reclaimable) : ''), [disk, reclaimable]);
  const hasReclaim = useMemo(() => reclaimable > 0, [reclaimable]);
  const driveName = useMemo(() => (disk ? `Диск ${disk.drive}:` : 'Диск'), [disk]);

  const usedStyle = useMemo(() => {
    if (!disk) return { width: '0%' };
    const used = disk.total - disk.free - reclaimable;
    return { width: `${(Math.max(used, 0) / disk.total) * 100}%` };
  }, [disk, reclaimable]);
  const reclaimStyle = useMemo(() => {
    if (!disk) return { width: '0%' };
    return { width: `${(reclaimable / disk.total) * 100}%` };
  }, [disk, reclaimable]);

  return (
    <section className={styles.overview}>
      <div className={styles.overviewText}>
        <span className={styles.overviewLabel}>{driveName} свободно</span>
        <span className={styles.overviewValue} data-testid="disk-free">
          {freeText}
          <span className={styles.overviewTotal}> из {totalText}</span>
        </span>
      </div>
      {hasReclaim && (
        <div className={styles.overviewAfter}>
          <span className={styles.overviewLabel}>После чистки</span>
          <span className={styles.overviewAfterValue}>{afterText}</span>
        </div>
      )}
      <div className={styles.diskBar} role="presentation">
        <div className={styles.diskUsed} style={usedStyle} />
        <div className={styles.diskReclaim} style={reclaimStyle} />
      </div>
    </section>
  );
});
