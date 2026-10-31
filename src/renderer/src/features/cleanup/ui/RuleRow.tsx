import { Check } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import type { RuleView, ScanRow } from '../../../../../shared/contract';
import { formatSize } from '../../../shared/lib/format';
import { isSelectable } from '../model/reducer';
import styles from './cleanup.module.css';

interface Props {
  rule: RuleView;
  row: ScanRow | undefined;
  checked: boolean;
  locked: boolean;
  onToggle: (id: string) => void;
}

export const RuleRow = memo(function RuleRow({ rule, row, checked, locked, onToggle }: Props) {
  const handleChange = useCallback(() => onToggle(rule.id), [onToggle, rule.id]);
  const selectable = useMemo(() => isSelectable(row), [row]);
  const disabled = useMemo(() => locked || !selectable, [locked, selectable]);
  const note = useMemo(() => row?.reason ?? rule.note, [row, rule.note]);
  const hasProblem = useMemo(() => row !== undefined && row.status !== 'ok', [row]);
  const sizeText = useMemo(() => {
    if (!row) return null;
    if (row.status !== 'ok') return '—';
    return row.size > 0 ? formatSize(row.size) : 'Чисто';
  }, [row]);
  const className = useMemo(
    () => [styles.row, disabled ? styles.rowDisabled : '', checked ? styles.rowChecked : ''].join(' '),
    [disabled, checked],
  );
  const noteClassName = useMemo(() => (hasProblem ? styles.rowWarning : styles.rowNote), [hasProblem]);

  return (
    <label className={className} data-testid={`rule-${rule.id}`}>
      <input
        className={styles.checkboxInput}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
      />
      <span className={styles.checkbox} aria-hidden="true">
        <Check size={14} strokeWidth={3} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowName}>{rule.name}</span>
        <span className={noteClassName}>{note}</span>
      </span>
      {sizeText === null ? (
        <span className={styles.skeleton} aria-label="Считаю" />
      ) : (
        <span className={styles.rowSize}>{sizeText}</span>
      )}
    </label>
  );
});
