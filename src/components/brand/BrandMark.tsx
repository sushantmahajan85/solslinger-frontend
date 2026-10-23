import Image from 'next/image';
import Link from 'next/link';
import styles from './BrandMark.module.css';

export function BrandMark({ href = '/', compact = false }: { href?: string | null; compact?: boolean }) {
  const content = (
    <>
      <Image src="/brand/logo.webp" alt="" width={36} height={36} className={styles.icon} />
      <span className={styles.wordmark}>
        Solslinger{compact ? null : <span className={styles.studio}>Studio</span>}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={styles.brand} aria-label="Solslinger Studio — home">
      {content}
    </Link>
  ) : (
    <span className={styles.brand}>{content}</span>
  );
}
