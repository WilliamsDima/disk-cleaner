import { memo, useMemo } from 'react';
import type { RuleView, ScanRow } from '../../../../../shared/contract';
import { RuleRow } from './RuleRow';
import styles from './cleanup.module.css';

interface Props {
  title: string;
  hint: string;
  rules: RuleView[];
  rows: Record<string, ScanRow>;
  selected: string[];
  locked: boolean;
  onToggle: (id: string) => void;
}

export const RuleSection = memo(function RuleSection({ title, hint, rules, rows, selected, locked, onToggle }: Props) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionHint}>{hint}</p>
      </header>
      <div className={styles.rows}>
        {rules.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            row={rows[rule.id]}
            checked={selectedSet.has(rule.id)}
            locked={locked}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
});
