import { useId, useRef } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import styles from './ImportResultModal.module.scss';

export type ImportResultModalType = 'success' | 'error';

interface ImportResultModalProps {
  isOpen: boolean;
  type: ImportResultModalType;
  title: string;
  message: string;
  onClose: () => void;
}

export function ImportResultModal({
  isOpen,
  type,
  title,
  message,
  onClose,
}: ImportResultModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div
            className={`${styles.iconWrapper} ${isSuccess ? styles.iconWrapperSuccess : styles.iconWrapperError}`}
          >
            {isSuccess ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div className={styles.headerText}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <p id={descriptionId} className={styles.message}>
              {message}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            className={isSuccess ? styles.confirmButton : styles.errorButton}
            onClick={onClose}
          >
            {isSuccess ? 'Done' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
