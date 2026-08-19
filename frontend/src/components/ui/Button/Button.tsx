import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { joinClassNames } from '../../../utils/classNames';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const buttonClassName = joinClassNames(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className
  );

  return (
    <button className={buttonClassName} disabled={disabled || loading} {...rest}>
      {loading ? <span className={styles.spinner} /> : leftIcon}
      {children}
    </button>
  );
}
