import { ShieldCheck } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { RuleView, ScanRow } from '../../../../../shared/contract';
import { formatSize } from '../../../shared/lib/format';
import { Modal } from './Modal';
import styles from './cleanup.module.css';

interface Props {
  rules: RuleView[];
  rows: Record<string, ScanRow>;
  selected: string[];
  reclaimable: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = memo(function ConfirmDialog({
  rules,
  rows,
  selected,
  reclaimable,
  onConfirm,
  onCancel,
}: Props) {
  const items = useMemo(() => rules.filter((rule) => selected.includes(rule.id)), [rules, selected]);
  const title = useMemo(() => `Удалить ${formatSize(reclaimable)}?`, [reclaimable]);

  return (
    <Modal title={title} onClose={onCancel}>
      <ul className={styles.summaryList}>
        {items.map((rule) => (
          <li key={rule.id} className={styles.summaryItem}>
            <span>{rule.name}</span>
            <span className={styles.summarySize}>{formatSize(rows[rule.id]?.size ?? 0)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.safetyNote}>
        <ShieldCheck size={16} />
        Сохранения игр, пароли и ключи не затрагиваются. Файлы удаляются сразу, минуя корзину.
      </p>
      <div className={styles.modalActions}>
        <button className={styles.buttonGhost} type="button" autoFocus onClick={onCancel}>
          Отмена
        </button>
        <button className={styles.buttonPrimary} type="button" onClick={onConfirm}>
          Удалить
        </button>
      </div>
    </Modal>
  );
});
