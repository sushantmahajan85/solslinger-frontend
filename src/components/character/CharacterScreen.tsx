'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { JourneyShell } from '@/components/layout/JourneyShell';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { AlertIcon, ArrowLeftIcon } from '@/components/ui/Icons';
import { SectionHeading, StatePanel } from '@/components/ui/Status';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { routeFor, useJourneyGuard, useSession } from '@/lib/session';
import type { Character } from '@/lib/types';
import { BountyDossier } from './BountyDossier';
import { CharacterCard } from './CharacterCard';
import styles from './Character.module.css';

export function CharacterScreen() {
  const allowed = useJourneyGuard('character');
  const { token, profile, setProfile } = useSession();
  const router = useRouter();
  const faction = profile?.faction ?? null;
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!faction) return;
    setLoadError(null);
    setCharacters(null);
    api
      .factionCharacters(faction.slug)
      .then(({ characters: list }) => {
        setCharacters(list);
        setActiveSlug((current) => current ?? list[0]?.slug ?? null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [faction]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from the external API
    if (allowed) load();
  }, [allowed, load]);

  const active = characters?.find((c) => c.slug === activeSlug) ?? null;

  const claim = async () => {
    if (!token || !active) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { profile: updated } = await api.chooseCharacter(token, active.slug);
      setProfile(updated);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Your identity could not be recorded.');
      setSubmitting(false);
    }
  };

  if (!allowed || !faction) {
    return (
      <div className={styles.pending}>
        <Spinner size={22} label="Loading" />
      </div>
    );
  }

  return (
    <JourneyShell current="character" faction={faction.themeKey}>
      <div className={styles.layout}>
        <section className={styles.roster} aria-labelledby="character-title">
          <Button
            variant="ghost"
            icon={<ArrowLeftIcon size={16} />}
            className={styles.back}
            onClick={() => router.push(routeFor('faction'))}
          >
            Back to allegiance
          </Button>
          <SectionHeading
            as="h1"
            id="character-title"
            eyebrow={`${faction.name} · ${faction.metaphor}`}
            title="Claim your identity"
            description="Study the roster. Open a dossier, learn the legend, and choose the name you will carry into the Bloody Raven."
          />

          {loadError ? (
            <StatePanel tone="error" title="The roster could not be retrieved" message={loadError} onRetry={load} />
          ) : !characters ? (
            <StatePanel tone="loading" title="Retrieving the roster…" />
          ) : characters.length === 0 ? (
            <StatePanel title="No riders on the roster yet" message="This faction has no characters available right now." />
          ) : (
            <fieldset className={styles.grid}>
              <legend className="visually-hidden">Characters of {faction.name}</legend>
              {characters.map((character, index) => (
                <CharacterCard
                  key={character.slug}
                  character={character}
                  checked={character.slug === activeSlug}
                  priority={index < 4}
                  onSelect={() => setActiveSlug(character.slug)}
                />
              ))}
            </fieldset>
          )}
        </section>

        <aside className={styles.dossierColumn} aria-label="Bounty dossier">
          {active ? (
            <BountyDossier
              character={active}
              fileNumber={(characters?.indexOf(active) ?? 0) + 1}
              onClaim={() => {
                setSubmitError(null);
                setConfirmOpen(true);
              }}
            />
          ) : characters ? null : (
            <div className={styles.dossierSkeleton} aria-hidden="true" />
          )}
        </aside>
      </div>

      <Dialog
        open={confirmOpen && !!active}
        onClose={() => setConfirmOpen(false)}
        locked={submitting}
        themed
        size="sm"
        eyebrow="Bind your passport"
        title={active ? `Ride as ${active.name}?` : ''}
        description={
          active
            ? `${active.name} will be bound to your passport and becomes your face in the Bloody Raven. This choice cannot be changed later.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Keep looking
            </Button>
            <Button variant="faction" loading={submitting} loadingLabel="Binding…" onClick={claim}>
              Claim identity
            </Button>
          </>
        }
      >
        {submitError ? (
          <p className={styles.error} role="alert">
            <AlertIcon size={16} />
            {submitError}
          </p>
        ) : null}
      </Dialog>
    </JourneyShell>
  );
}
