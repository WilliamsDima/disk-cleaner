import { useCallback, useMemo, useState } from 'react';
import { useCleanup } from '../features/cleanup/model/useCleanup';
import { ActionBar } from '../features/cleanup/ui/ActionBar';
import { ConfirmDialog } from '../features/cleanup/ui/ConfirmDialog';
import { DiskOverview } from '../features/cleanup/ui/DiskOverview';
import { ResultDialog } from '../features/cleanup/ui/ResultDialog';
import { RuleSection } from '../features/cleanup/ui/RuleSection';
import cleanupStyles from '../features/cleanup/ui/cleanup.module.css';
import styles from './App.module.css';

export function App() {
  const { state, scan, toggle, clean, dismissReport, openLog } = useCleanup();
  const { phase, rules, rows, selected, disk, cleaningName, report, error } = state;
  const [confirming, setConfirming] = useState(false);

  const safeRules = useMemo(() => rules.filter((rule) => rule.group === 'safe'), [rules]);
  const slowRules = useMemo(() => rules.filter((rule) => rule.group === 'slow'), [rules]);
  const reclaimable = useMemo(() => selected.reduce((sum, id) => sum + (rows[id]?.size ?? 0), 0), [selected, rows]);
  const selectedCount = useMemo(() => selected.length, [selected]);
  const locked = useMemo(() => phase !== 'ready', [phase]);

  const openConfirm = useCallback(() => setConfirming(true), []);
  const closeConfirm = useCallback(() => setConfirming(false), []);
  const handleRescan = useCallback(() => {
    void scan();
  }, [scan]);
  const handleConfirm = useCallback(() => {
    setConfirming(false);
    void clean(selected);
  }, [clean, selected]);

  return (
    <div className={styles.shell}>
      <div className={styles.titleBar}>Чистка диска</div>
      <main className={styles.content}>
        <DiskOverview disk={disk} reclaimable={reclaimable} />
        {error && <p className={cleanupStyles.errorBanner}>{error}</p>}
        <RuleSection
          title="Можно чистить смело"
          hint="Всё это создаётся заново или скачивается при необходимости."
          rules={safeRules}
          rows={rows}
          selected={selected}
          locked={locked}
          onToggle={toggle}
        />
        <RuleSection
          title="Можно, но потом что-то будет медленнее"
          hint="Данные не пострадают, но кэш придётся накапливать заново. По умолчанию не выбрано."
          rules={slowRules}
          rows={rows}
          selected={selected}
          locked={locked}
          onToggle={toggle}
        />
      </main>
      <ActionBar
        phase={phase}
        cleaningName={cleaningName}
        reclaimable={reclaimable}
        selectedCount={selectedCount}
        onRescan={handleRescan}
        onClean={openConfirm}
      />
      {confirming && (
        <ConfirmDialog
          rules={rules}
          rows={rows}
          selected={selected}
          reclaimable={reclaimable}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
      )}
      {report && <ResultDialog report={report} onClose={dismissReport} onOpenLog={openLog} />}
    </div>
  );
}
