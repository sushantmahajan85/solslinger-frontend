import { useId } from 'react';
import { CheckIcon } from './Icons';
import styles from './Field.module.css';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export function Checkbox({ label, description, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  return (
    <div className={[styles.checkboxRow, className].filter(Boolean).join(' ')}>
      <span className={styles.checkboxControl}>
        <input id={inputId} type="checkbox" className={styles.checkboxInput} aria-describedby={descriptionId} {...rest} />
        <span className={styles.checkboxBox} aria-hidden="true">
          <CheckIcon size={14} strokeWidth={2.5} />
        </span>
      </span>
      <span className={styles.checkboxText}>
        <label htmlFor={inputId} className={styles.checkboxLabel}>
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className={styles.hint}>
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextInput({ label, hint, error, id, ...rest }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint || error ? `${inputId}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={hintId}
        {...rest}
      />
      {error || hint ? (
        <span id={hintId} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}
