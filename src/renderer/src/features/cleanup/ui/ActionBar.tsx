import { RefreshCw, Sparkles } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { Phase } from '../model/reducer';
import { formatSize } from '../../../shared/lib/format';
import styles from './cleanup.module.css';

interface Props {
  phase: Phase;
  cleaningName: string | null;
  reclaimable: number;
  selectedCount: number;
  onRescan: () => void;
  onClean: () => void;
}

export const ActionBar = memo(function ActionBar({
  phase,
  cleaningName,
  reclaimable,
  selectedCount,
  onRescan,
  onClean,
}: Props) {
  const busy = useMemo(() => phase !== 'ready', [phase]);
  const canClean = useMemo(() => phase === 'ready' && reclaimable > 0, [phase, reclaimable]);
  const status = useMemo(() => {
    if (phase === 'cleaning') return cleaningName ? `Чищу: ${cleaningName}` : 'Чищу…';
    if (phase !== 'ready') return 'Считаю размеры…';
    if (selectedCount === 0) return 'Ничего не выбрано';
    return `Выбрано пунктов: ${selectedCount}`;
  }, [phase, cleaningName, selectedCount]);
  const cleanLabel = useMemo(
    () => (reclaimable > 0 ? `Освободить ${formatSize(reclaimable)}` : 'Освободить'),
    [reclaimable],
  );

  return (
    <footer className={styles.actionBar}>
      <span className={styles.status} role="status">
        {busy && <span className={styles.spinner} aria-hidden="true" />}
        {status}
      </span>
      <button className={styles.buttonGhost} type="button" disabled={busy} onClick={onRescan}>
        <RefreshCw size={15} />
        Пересчитать
      </button>
      <button className={styles.buttonPrimary} type="button" disabled={!canClean} onClick={onClean}>
        <Sparkles size={15} />
        {cleanLabel}
      </button>
    </footer>
  );
});
