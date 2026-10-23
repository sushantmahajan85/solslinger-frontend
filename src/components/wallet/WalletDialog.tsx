'use client';

import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog } from '@/components/ui/Dialog';
import { ArrowRightIcon, WalletIcon } from '@/components/ui/Icons';
import styles from './Wallet.module.css';

const SUGGESTED_WALLETS = [
  { name: 'Phantom', url: 'https://phantom.com/download' },
  { name: 'Solflare', url: 'https://solflare.com/download' },
  { name: 'Backpack', url: 'https://backpack.app/download' },
];

export function WalletDialog({
  open,
  onClose,
  onSelected,
}: {
  open: boolean;
  onClose: () => void;
  onSelected: () => void;
}) {
  const { wallets, select } = useWallet();
  const available = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );

  const choose = (name: WalletName) => {
    onSelected();
    select(name);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Wallet"
      title="Choose your wallet"
      description="Your wallet is your passport on the frontier. Signing in only asks for a message signature — no transaction, no fees."
    >
      {available.length ? (
        <ul className={styles.walletList}>
          {available.map(({ adapter }) => (
            <li key={adapter.name}>
              <button type="button" className={styles.walletOption} onClick={() => choose(adapter.name)}>
                {/* Wallet icons are data URIs supplied by the wallet itself. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={adapter.icon} alt="" width={28} height={28} className={styles.walletIcon} />
                <span className={styles.walletName}>{adapter.name}</span>
                <span className={styles.walletMeta}>Detected</span>
                <ArrowRightIcon size={16} className={styles.walletArrow} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.noWallet}>
          <span className={styles.noWalletIcon} aria-hidden="true">
            <WalletIcon size={22} />
          </span>
          <p className={styles.noWalletTitle}>No Solana wallet detected</p>
          <p className={styles.noWalletText}>Install a Solana wallet extension, then reload this page.</p>
          <ul className={styles.installLinks}>
            {SUGGESTED_WALLETS.map((wallet) => (
              <li key={wallet.name}>
                <a href={wallet.url} target="_blank" rel="noopener noreferrer">
                  Get {wallet.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
