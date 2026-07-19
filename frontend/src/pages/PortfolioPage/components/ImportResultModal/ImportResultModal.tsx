import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../components/ui';
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
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="import-result-title"
        aria-describedby="import-result-message"
      >
        <div className={styles.header}>
          <div
            className={`${styles.iconWrapper} ${isSuccess ? styles.iconWrapperSuccess : styles.iconWrapperError}`}
          >
            {isSuccess ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div className={styles.headerText}>
            <h2 id="import-result-title" className={styles.title}>
              {title}
            </h2>
            <p id="import-result-message" className={styles.message}>
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
