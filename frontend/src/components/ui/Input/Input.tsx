import type { InputHTMLAttributes, ReactNode } from 'react';
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
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={wrapClass}>
        <input
          id={id}
          className={styles.input}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
        {rightElement}
      </div>
      {hint && !error && !success && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.errorText}>{error}</span>}
      {success && !error && <span className={styles.successText}>{success}</span>}
    </div>
  );
}
