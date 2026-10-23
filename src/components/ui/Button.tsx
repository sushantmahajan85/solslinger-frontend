import { forwardRef } from 'react';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'faction';
type Size = 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    icon,
    iconPosition = 'start',
    fullWidth,
    className,
    disabled,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [styles.button, styles[variant], styles[size], fullWidth && styles.full, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 16} /> : iconPosition === 'start' ? icon : null}
      <span className={styles.label}>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && iconPosition === 'end' ? icon : null}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={[styles.iconButton, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
