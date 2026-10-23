'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IconButton } from './Button';
import { AlertIcon, CheckIcon, CloseIcon, StarIcon } from './Icons';
import styles from './Toast.module.css';

type Tone = 'info' | 'success' | 'error' | 'coming-soon';

interface ToastInput {
  title: string;
  message?: string;
  eyebrow?: string;
  tone?: Tone;
  /** Milliseconds before auto-dismiss; 0 keeps it until dismissed. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastInput, 'message' | 'eyebrow'>> {
  id: number;
  message?: string;
  eyebrow?: string;
}

const ToastContext = createContext<{ show: (toast: ToastInput) => void; dismiss: (id: number) => void } | null>(null);

const ICONS: Record<Tone, React.ReactNode> = {
  info: <StarIcon size={18} />,
  success: <CheckIcon size={18} />,
  error: <AlertIcon size={18} />,
  'coming-soon': <StarIcon size={18} />,
};

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!toast.duration || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.duration, onDismiss]);

  return (
    <div
      className={`${styles.toast} ${styles[toast.tone]}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={styles.icon}>{ICONS[toast.tone]}</span>
      <div className={styles.copy}>
        {toast.eyebrow ? <p className={styles.eyebrow}>{toast.eyebrow}</p> : null}
        <p className={styles.title}>{toast.title}</p>
        {toast.message ? <p className={styles.message}>{toast.message}</p> : null}
      </div>
      <IconButton label="Dismiss notification" onClick={onDismiss} className={styles.close}>
        <CloseIcon size={16} />
      </IconButton>
      {toast.duration ? (
        <span
          className={styles.timer}
          style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((input: ToastInput) => {
    const toast: ToastItem = { tone: 'info', duration: 5000, ...input, id: nextId.current++ };
    // Keep at most three, and replace an identical message instead of stacking duplicates.
    setToasts((list) => [...list.filter((t) => t.title !== toast.title).slice(-2), toast]);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) dismiss(toasts[toasts.length - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toasts, dismiss]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section className={styles.region} aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
