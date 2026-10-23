'use client';

import { useEffect, useId, useRef } from 'react';
import { IconButton } from './Button';
import { CloseIcon } from './Icons';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Prevent dismissal (Esc / backdrop / close button) while an action is in flight. */
  locked?: boolean;
  size?: 'sm' | 'md';
  /** Tint borders with the active faction colour. */
  themed?: boolean;
  /** Element to focus when the dialog opens; defaults to the first focusable element. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/** Native <dialog> rendered modally: the page behind becomes inert and focus is contained. */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  locked = false,
  size = 'md',
  themed = false,
  initialFocusRef,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (!locked) onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [locked, onClose]);

  return (
    <dialog
      ref={ref}
      className={[styles.dialog, styles[size], themed && styles.themed].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === ref.current && !locked) onClose();
      }}
    >
      {/* Content mounts only while open: it may depend on browser-only state (e.g. detected wallets). */}
      {open ? (
        <div className={styles.panel}>
          <span className={styles.rivets} aria-hidden="true" />
          <header className={styles.header}>
            <div className={styles.headings}>
              {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            </div>
            <IconButton label="Close" onClick={onClose} disabled={locked} className={styles.close}>
              <CloseIcon />
            </IconButton>
          </header>
          {description ? (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          ) : null}
          {children ? <div className={styles.body}>{children}</div> : null}
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
