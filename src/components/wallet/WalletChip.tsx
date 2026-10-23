'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LogoutIcon } from '@/components/ui/Icons';
import { shortAddress } from '@/lib/format';
import { useSession } from '@/lib/session';
import styles from './Wallet.module.css';

/** Compact signed-in wallet indicator with a disconnect menu. */
export function WalletChip({ className }: { className?: string }) {
  const { profile, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!profile) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.walletAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the full address remains visible in the menu.
    }
  };

  return (
    <div ref={rootRef} className={[styles.chipRoot, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.chip}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.chipDot} aria-hidden="true" />
        <span className="visually-hidden">Connected wallet </span>
        <span className={styles.chipAddress}>{shortAddress(profile.walletAddress)}</span>
      </button>
      {open ? (
        <div id={menuId} role="menu" className={styles.menu}>
          <p className={styles.menuLabel}>Signed in as</p>
          <p className={styles.menuAddress}>{profile.walletAddress}</p>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={copy}>
            {copied ? 'Address copied' : 'Copy address'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${styles.menuItem} ${styles.menuDanger}`}
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <LogoutIcon size={16} />
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
