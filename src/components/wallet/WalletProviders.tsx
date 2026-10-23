'use client';

import type { Adapter } from '@solana/wallet-adapter-base';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-unsafe-burner';
import { useMemo } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { ENABLE_DEV_WALLET } from '@/lib/config';
import { SessionProvider } from '@/lib/session';

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Phantom, Solflare, Backpack and other Wallet Standard wallets register themselves automatically.
  const wallets = useMemo<Adapter[]>(() => (ENABLE_DEV_WALLET ? [new UnsafeBurnerWalletAdapter()] : []), []);

  return (
    <WalletProvider wallets={wallets} autoConnect onError={() => undefined}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </WalletProvider>
  );
}
