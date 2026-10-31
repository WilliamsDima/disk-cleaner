import { memo, useEffect, useRef, type ReactNode } from 'react';
import styles from './cleanup.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = memo(function Modal({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} className={styles.modal} onCancel={onClose} aria-label={title}>
      <h2 className={styles.modalTitle}>{title}</h2>
      {children}
    </dialog>
  );
});
