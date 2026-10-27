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

// Drifting embers: fixed values (not random) so server and client render identically.
// [left %, size px, rise seconds, delay seconds, sideways drift px]
const EMBERS: [number, number, number, number, number][] = [
  [6, 3, 15, 0, 40],
  [13, 2, 19, -6, -30],
  [21, 4, 17, -11, 55],
  [29, 2, 22, -3, -45],
  [37, 3, 16, -9, 35],
  [46, 2, 21, -14, -25],
  [54, 4, 18, -5, 50],
  [62, 2, 23, -17, -40],
  [69, 3, 15, -8, 30],
  [76, 4, 20, -2, -55],
  [83, 2, 17, -12, 45],
  [90, 3, 22, -7, -35],
  [96, 2, 19, -15, 25],
];

const TICKER = ['Outlaws', 'The Vance Line', 'Gamblers', 'The Bloody Raven', 'Nerve & Capital'];

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
      <div className={styles.embers} aria-hidden="true">
        {EMBERS.map(([left, size, rise, delay, drift], i) => (
          <span
            key={i}
            style={
              {
                left: `${left}%`,
                width: size,
                height: size,
                animationDuration: `${rise}s`,
                animationDelay: `${delay}s`,
                '--drift': `${drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className={styles.frame} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.header}>
        <BrandMark />
        {status === 'signed-in' ? (
          <WalletChip />
        ) : (
          <span className={styles.secure}>
            <span className={styles.securePip} aria-hidden="true" />
            Non-custodial sign-in
          </span>
        )}
      </header>

      <main className={styles.main}>
        <section className={styles.copy} aria-labelledby="landing-title">
          <p className={styles.eyebrow}>A frontier of nerve and capital</p>
          <h1 id="landing-title" className={styles.title}>
            <span className={styles.titleLine} style={{ '--i': 0 } as React.CSSProperties}>
              Draw your
            </span>
            <span className={styles.titleLine} style={{ '--i': 1 } as React.CSSProperties}>
              wallet.
            </span>
            <span className={`${styles.titleLine} ${styles.titleAccent}`} style={{ '--i': 2 } as React.CSSProperties}>
              Claim your
            </span>
            <span className={`${styles.titleLine} ${styles.titleAccent}`} style={{ '--i': 3 } as React.CSSProperties}>
              legend.
            </span>
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
                  className={styles.cta}
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
                <Button size="lg" className={styles.cta} icon={<WalletIcon size={18} />} onClick={startConnect}>
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
                className={styles.cta}
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
          <span className={styles.rays} aria-hidden="true" />
          <span className={styles.floorShadow} aria-hidden="true" />
          <div className={styles.float}>
            <div className={styles.tilt}>
              <span className={styles.aura} aria-hidden="true" />
              <Image
                src="/brand/logo.webp"
                alt="Solslinger — a masked gunslinger with glowing eyes beneath a wide-brimmed hat"
                width={2048}
                height={2048}
                preload
                quality={92}
                className={styles.logo}
                sizes="(max-width: 900px) 70vw, 600px"
              />
              <span className={styles.eyes} aria-hidden="true" />
              <span className={styles.glare} aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>

      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.tickerGroup}>
              {[...TICKER, ...TICKER].map((word, i) => (
                <span key={i} className={styles.tickerItem}>
                  {word}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

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
