'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/Button';
import { AlertIcon, ArrowRightIcon, SkipIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { routeFor, useJourneyGuard, useSession } from '@/lib/session';
import { usePointerParallax } from '@/lib/usePointerParallax';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { TrainSceneHandle } from './trainScene';
import styles from './Onboarding.module.css';

const ARRIVAL_SECONDS = 7;
// Without the animated crossing (reduced motion or no WebGL), hold the still frame briefly before moving on.
const STILL_HOLD_MS = 1800;

export function OnboardingScreen() {
  // Travellers who already arrived may ride in again (Back from Allegiance); nothing is re-saved.
  const allowed = useJourneyGuard('onboarding', { revisitable: true });
  const { token, profile, setProfile } = useSession();
  const router = useRouter();
  const replay = !!profile && profile.nextStep !== 'onboarding';
  const reducedMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [sceneState, setSceneState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  usePointerParallax(screenRef, allowed);

  // The PixiJS scene (and the train texture) only load for visitors who still need the arrival.
  useEffect(() => {
    if (!allowed || !hostRef.current) return;
    const host = hostRef.current;
    let handle: TrainSceneHandle | null = null;
    let cancelled = false;
    let lastReported = -1;

    import('./trainScene')
      .then(({ createTrainScene }) =>
        createTrainScene(host, {
          reducedMotion,
          arrivalSeconds: ARRIVAL_SECONDS,
          onProgress: (value) => {
            const rounded = Math.round(value * 100);
            if (rounded !== lastReported) {
              lastReported = rounded;
              setProgress(rounded);
            }
          },
        }),
      )
      .then((created) => {
        if (cancelled) created.destroy();
        else {
          handle = created;
          setSceneState('ready');
        }
      })
      .catch(() => {
        // WebGL unavailable or initialisation failed: fall back to a static composition.
        if (!cancelled) {
          setSceneState('fallback');
          setProgress(100);
        }
      });

    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [allowed, reducedMotion]);

  const arrived = progress >= 100;

  const finish = async () => {
    if (!token || !profile || leaving) return;
    setLeaving(true);
    setError(null);
    const fadeOut = new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 520));
    if (replay) {
      await fadeOut;
      router.replace(routeFor(profile.nextStep));
      return;
    }
    try {
      const [{ profile: updated }] = await Promise.all([api.completeOnboarding(token), fadeOut]);
      setProfile(updated);
      router.replace(routeFor(updated.nextStep));
    } catch (err) {
      setLeaving(false);
      setError(err instanceof Error ? err.message : 'Could not save your arrival. Try again.');
    }
  };

  // Once the train has steamed off the right edge, move on by itself.
  const finishOnArrival = useEffectEvent(() => void finish());
  const animated = sceneState === 'ready' && !reducedMotion;
  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(finishOnArrival, animated ? 0 : STILL_HOLD_MS);
    return () => clearTimeout(timer);
  }, [arrived, animated]);

  if (!allowed) {
    return (
      <div className={styles.pending}>
        <Spinner size={22} label="Loading" />
      </div>
    );
  }

  return (
    <div ref={screenRef} className={`${styles.screen} ${leaving ? styles.leaving : ''}`}>
      <div ref={hostRef} className={styles.canvasHost} />

      {sceneState === 'fallback' ? (
        <div className={styles.fallback} aria-hidden="true">
          <Image src="/scene/train-east.webp" alt="" fill preload sizes="100vw" className={styles.fallbackTrain} />
        </div>
      ) : null}
      {sceneState === 'loading' ? <div className={styles.curtain} aria-hidden="true" /> : null}

      <header className={styles.topBar}>
        <BrandMark href={null} />
        {!arrived ? (
          <Button variant="ghost" icon={<SkipIcon size={16} />} onClick={finish} disabled={leaving}>
            Skip arrival
          </Button>
        ) : null}
      </header>

      <section className={styles.titleBlock} aria-labelledby="onboarding-title">
        <p className={styles.eyebrow}>The Vance Line · Eastbound</p>
        <h1 id="onboarding-title" className={styles.title}>
          Next stop: Solslinger
        </h1>
        <p className={styles.lede}>
          The rails end where the legends begin. Steady your nerve, the territory is already watching.
        </p>
      </section>

      <div className={styles.console}>
        <div className={styles.gauge}>
          <div className={styles.gaugeHeader}>
            <span className={styles.gaugeLabel} aria-live="polite">
              {arrived ? 'Arriving at Solslinger…' : 'Full steam on the Vance Line'}
            </span>
            <span className={styles.gaugeValue} aria-hidden="true">
              {progress}%
            </span>
          </div>
          <div
            className={styles.track}
            role="progressbar"
            aria-label="Arrival progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span className={styles.fill} style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
        </div>
        {error ? (
          <>
            <p className={styles.error} role="alert">
              <AlertIcon size={16} />
              {error}
            </p>
            <Button
              size="lg"
              loading={leaving}
              loadingLabel="Jumping off…"
              icon={<ArrowRightIcon size={18} />}
              iconPosition="end"
              onClick={finish}
            >
              Try again
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
