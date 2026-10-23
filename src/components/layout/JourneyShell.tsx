import { BrandMark } from '@/components/brand/BrandMark';
import { CheckIcon } from '@/components/ui/Icons';
import { WalletChip } from '@/components/wallet/WalletChip';
import type { FactionTheme } from '@/lib/types';
import styles from './JourneyShell.module.css';

const STEPS = [
  { key: 'onboarding', label: 'Arrival' },
  { key: 'faction', label: 'Allegiance' },
  { key: 'character', label: 'Identity' },
  { key: 'lobby', label: 'The Bloody Raven' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

/** Shared frame for the allegiance and identity screens. */
export function JourneyShell({
  current,
  faction,
  children,
}: {
  current: StepKey;
  faction?: FactionTheme | null;
  children: React.ReactNode;
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className={styles.shell} data-faction={faction ?? undefined}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <header className={styles.header}>
        <BrandMark href={null} />
        <nav aria-label="Journey progress">
          <ol className={styles.steps}>
            {STEPS.map((step, index) => {
              const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
              return (
                <li key={step.key} className={styles[state]} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className={styles.marker} aria-hidden="true">
                    {state === 'done' ? <CheckIcon size={11} strokeWidth={2.75} /> : index + 1}
                  </span>
                  <span className={styles.stepLabel}>
                    {step.label}
                    {state === 'done' ? <span className="visually-hidden"> (complete)</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
        <WalletChip />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
