import { useRef, type ReactNode } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import styles from '../ProfilePage.module.scss';

interface ProfileDialogProps {
  titleId: string;
  onClose: () => void;
  disableClose?: boolean;
  children: ReactNode;
}

export function ProfileDialog({
  titleId,
  onClose,
  disableClose = false,
  children,
}: ProfileDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: true,
    onEscape: disableClose ? undefined : onClose,
  });

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!disableClose) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
