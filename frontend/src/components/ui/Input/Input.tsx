import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.scss';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  rightElement?: ReactNode;
  onChange: (value: string) => void;
}

export function Input({
  label,
  hint,
  error,
  success,
  rightElement,
  onChange,
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const successId = `${inputId}-success`;
  const showsHint = Boolean(hint) && !error && !success;
  const showsSuccess = Boolean(success) && !error;
  const describedBy = [
    error ? errorId : null,
    showsHint ? hintId : null,
    showsSuccess ? successId : null,
  ]
    .filter((describedById) => describedById !== null)
    .join(' ');
  const wrapClass = [
    styles.inputWrap,
    error ? styles.error : '',
    success && !error ? styles.success : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.fieldGroup}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={wrapClass}>
        <input
          {...rest}
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {rightElement}
      </div>
      {showsHint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.errorText}>
          {error}
        </span>
      )}
      {showsSuccess && (
        <span id={successId} className={styles.successText}>
          {success}
        </span>
      )}
    </div>
  );
}
