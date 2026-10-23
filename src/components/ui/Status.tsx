import { Button } from './Button';
import { AlertIcon, CheckIcon, RefreshIcon } from './Icons';
import { Spinner } from './Spinner';
import styles from './Status.module.css';

type StatusTone = 'idle' | 'pending' | 'success' | 'error' | 'faction';

/** Shape and text carry the meaning, colour only reinforces it. */
export function StatusIndicator({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className={`${styles.status} ${styles[tone]}`}>
      <span className={styles.mark} aria-hidden="true">
        {tone === 'pending' ? (
          <Spinner size={12} />
        ) : tone === 'success' ? (
          <CheckIcon size={12} strokeWidth={2.5} />
        ) : tone === 'error' ? (
          <AlertIcon size={12} strokeWidth={2.25} />
        ) : (
          <span className={styles.dot} />
        )}
      </span>
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = 'h2',
  align = 'start',
  id,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'start' | 'center';
  id?: string;
}) {
  return (
    <div className={`${styles.heading} ${align === 'center' ? styles.center : ''}`}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <Tag id={id} className={styles[Tag]}>
        {title}
      </Tag>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}

export function StatePanel({
  tone = 'empty',
  title,
  message,
  onRetry,
}: {
  tone?: 'empty' | 'error' | 'loading';
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={`${styles.panel} ${styles[`panel-${tone}`]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.panelIcon} aria-hidden="true">
        {tone === 'loading' ? <Spinner size={20} /> : <AlertIcon size={20} />}
      </span>
      <p className={styles.panelTitle}>{title}</p>
      {message ? <p className={styles.panelMessage}>{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} icon={<RefreshIcon size={16} />}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
