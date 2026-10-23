'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/Button';
import { AlertIcon, ArrowRightIcon, WalletIcon } from '@/components/ui/Icons';
import { StatusIndicator } from '@/components/ui/Status';
import { WalletChip } from '@/components/wallet/WalletChip';
import { WalletDialog } from '@/components/wallet/WalletDialog';
import { MINIMUM_AGE } from '@/lib/config';
import { routeFor, useSession } from '@/lib/session';
import type { NextStep } from '@/lib/types';
import { usePointerParallax } from '@/lib/usePointerParallax';
import { AgeGateDialog } from './AgeGateDialog';
import styles from './Landing.module.css';

const NEXT_STEP_LABEL: Record<NextStep, string> = {
  onboarding: 'Board the Vance Line',
  faction: 'Swear your allegiance',
  character: 'Claim your identity',
  lobby: 'Enter the Bloody Raven',
};

export function LandingScreen() {
  const router = useRouter();
  const wallet = useWallet();
  const session = useSession();
  const [ageOpen, setAgeOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  usePointerParallax(screenRef);

  const { status, profile, ageConfirmed, error } = session;
  const walletBusy = wallet.connecting && status === 'signed-out';
  const needsSignature = status === 'signed-out' && wallet.connected;

  const startConnect = () => {
    session.clearError();
    if (!ageConfirmed) setAgeOpen(true);
    else if (wallet.connected) void session.signIn();
    else setWalletOpen(true);
  };

  const ageStep = ageConfirmed ? 'success' : 'idle';
  const walletStep =
    status === 'signed-in' || wallet.connected ? 'success' : walletBusy ? 'pending' : 'idle';
  const signStep = status === 'signed-in' ? 'success' : status === 'signing-in' ? 'pending' : error ? 'error' : 'idle';

  return (
    <div ref={screenRef} className={styles.screen}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <BrandMark />
        {status === 'signed-in' ? <WalletChip /> : null}
      </header>

      <main className={styles.main}>
        <section className={styles.copy} aria-labelledby="landing-title">
          <p className={styles.eyebrow}>A frontier of nerve and capital</p>
          <h1 id="landing-title" className={styles.title}>
            <span className={styles.titleLine}>Draw your wallet.</span>
            <span className={styles.titleAccent}>Claim your legend.</span>
          </h1>
          <p className={styles.lede}>
            Step off the Vance Line into a territory run by outlaws, auditors and high-stakes gamblers. Swear allegiance,
            take up a name, and walk into the Bloody Raven.
          </p>

          <div className={styles.actions}>
            {status === 'restoring' ? (
              <Button size="lg" loading loadingLabel="Checking your passport…" />
            ) : status === 'signed-in' && profile ? (
              <div className={styles.passport}>
                <p className={styles.passportLabel}>
                  {profile.character ? `Welcome back, ${profile.character.name}` : 'Passport verified'}
                </p>
                <Button
                  size="lg"
                  icon={<ArrowRightIcon size={18} />}
                  iconPosition="end"
                  onClick={() => router.push(routeFor(profile.nextStep))}
                >
                  {NEXT_STEP_LABEL[profile.nextStep]}
                </Button>
              </div>
            ) : status === 'signing-in' ? (
              <Button size="lg" loading loadingLabel="Approve the signature in your wallet…" />
            ) : needsSignature ? (
              <div className={styles.actionRow}>
                <Button size="lg" icon={<WalletIcon size={18} />} onClick={startConnect}>
                  Sign in with {wallet.wallet?.adapter.name ?? 'wallet'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await wallet.disconnect().catch(() => undefined);
                    setWalletOpen(true);
                  }}
                >
                  Use another wallet
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                icon={<WalletIcon size={18} />}
                loading={walletBusy}
                loadingLabel="Connecting wallet…"
                onClick={startConnect}
              >
                Connect wallet
              </Button>
            )}

            {error && status !== 'signed-in' ? (
              <p className={styles.error} role="alert">
                <AlertIcon size={16} />
                {error}
              </p>
            ) : null}
          </div>

          {status !== 'signed-in' ? (
            <ol className={styles.steps} aria-label="Sign-in progress">
              <li>
                <StatusIndicator tone={ageStep}>Confirm age</StatusIndicator>
              </li>
              <li>
                <StatusIndicator tone={walletStep}>Connect wallet</StatusIndicator>
              </li>
              <li>
                <StatusIndicator tone={signStep}>Sign message</StatusIndicator>
              </li>
            </ol>
          ) : null}
        </section>

        <div className={styles.art}>
          <div className={styles.float}>
            <div className={styles.tilt}>
              <Image
                src="/brand/logo.webp"
                alt="Solslinger — a masked gunslinger with glowing eyes beneath a wide-brimmed hat"
                width={640}
                height={640}
                priority
                className={styles.logo}
                sizes="(max-width: 900px) 70vw, 40vw"
              />
              <span className={styles.eyes} aria-hidden="true" />
              <span className={styles.glare} aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>{MINIMUM_AGE}+ only</span>
        <span aria-hidden="true">·</span>
        <span>Signing in never moves funds</span>
        <span aria-hidden="true">·</span>
        <span>© Solslinger Studio</span>
      </footer>

      <AgeGateDialog
        open={ageOpen}
        onClose={() => setAgeOpen(false)}
        onConfirm={() => {
          session.confirmAge();
          setAgeOpen(false);
          if (wallet.connected) void session.signIn();
          else setWalletOpen(true);
        }}
      />
      <WalletDialog open={walletOpen} onClose={() => setWalletOpen(false)} onSelected={session.requestSignIn} />
    </div>
  );
}
