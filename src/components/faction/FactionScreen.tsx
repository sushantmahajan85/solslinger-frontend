'use client';

import { useCallback, useEffect, useState } from 'react';
import { JourneyShell } from '@/components/layout/JourneyShell';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox } from '@/components/ui/Field';
import { AlertIcon, LockIcon } from '@/components/ui/Icons';
import { SectionHeading, StatePanel } from '@/components/ui/Status';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useJourneyGuard, useSession } from '@/lib/session';
import type { Faction } from '@/lib/types';
import { FactionCard } from './FactionCard';
import styles from './Faction.module.css';

export function FactionScreen() {
  const allowed = useJourneyGuard('faction');
  const { token, setProfile } = useSession();
  const [factions, setFactions] = useState<Faction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    setFactions(null);
    api
      .factions()
      .then(({ factions: list }) => setFactions(list))
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from the external API
    if (allowed) load();
  }, [allowed, load]);

  const chosen = factions?.find((f) => f.slug === selected) ?? null;

  const swear = async () => {
    if (!token || !chosen) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { profile } = await api.chooseFaction(token, chosen.slug);
      setProfile(profile);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Your allegiance could not be recorded.');
      setSubmitting(false);
    }
  };

  if (!allowed) {
    return (
      <div className={styles.pending}>
        <Spinner size={22} label="Loading" />
      </div>
    );
  }

  return (
    <JourneyShell current="faction" faction={chosen?.themeKey}>
      <div className={styles.layout}>
        <SectionHeading
          as="h1"
          align="center"
          eyebrow="Allegiance"
          title="Choose your faction"
          description="Three powers hold the territory. Your allegiance colours every table you sit at, and it is sworn for life."
        />

        {loadError ? (
          <StatePanel tone="error" title="The faction roll could not be read" message={loadError} onRetry={load} />
        ) : !factions ? (
          <StatePanel tone="loading" title="Unrolling the faction charter…" />
        ) : factions.length === 0 ? (
          <StatePanel title="No factions are open yet" message="Check back once the territory opens its doors." />
        ) : (
          <fieldset className={styles.grid}>
            <legend className="visually-hidden">Factions</legend>
            {factions.map((faction) => (
              <FactionCard
                key={faction.slug}
                faction={faction}
                checked={selected === faction.slug}
                dimmed={selected !== null && selected !== faction.slug}
                onSelect={() => setSelected(faction.slug)}
              />
            ))}
          </fieldset>
        )}

        <div className={styles.actionBar} data-faction={chosen?.themeKey}>
          <p className={styles.permanence}>
            <LockIcon size={16} />
            Allegiance is permanent. Choose with care.
          </p>
          <Button
            variant={chosen ? 'faction' : 'primary'}
            size="lg"
            disabled={!chosen}
            onClick={() => {
              setAcknowledged(false);
              setSubmitError(null);
              setConfirmOpen(true);
            }}
          >
            {chosen ? `Swear allegiance to ${chosen.name}` : 'Select a faction'}
          </Button>
        </div>
      </div>

      <div data-faction={chosen?.themeKey}>
        <Dialog
          open={confirmOpen && !!chosen}
          onClose={() => setConfirmOpen(false)}
          locked={submitting}
          themed
          eyebrow="Permanent allegiance"
          title={chosen ? `Ride with ${chosen.name}?` : ''}
          description="Once sworn, your allegiance can never be changed. Your character roster, the colours of the Bloody Raven and every future faction event will follow this choice."
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                Not yet
              </Button>
              <Button variant="faction" disabled={!acknowledged} loading={submitting} loadingLabel="Swearing…" onClick={swear}>
                Swear allegiance
              </Button>
            </>
          }
        >
          <Checkbox
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            label={chosen ? `I understand that joining ${chosen.name} is permanent and irreversible.` : ''}
          />
          {submitError ? (
            <p className={styles.error} role="alert">
              <AlertIcon size={16} />
              {submitError}
            </p>
          ) : null}
        </Dialog>
      </div>
    </JourneyShell>
  );
}
