import { CheckIcon } from '@/components/ui/Icons';
import type { Faction } from '@/lib/types';
import styles from './Faction.module.css';

export function FactionCard({
  faction,
  checked,
  dimmed,
  locked = false,
  onSelect,
}: {
  faction: Faction;
  checked: boolean;
  dimmed: boolean;
  /** Allegiance already sworn: the card is shown but cannot be selected. */
  locked?: boolean;
  onSelect: () => void;
}) {
  const inputId = `faction-${faction.slug}`;
  return (
    <label
      htmlFor={inputId}
      className={`${styles.card} ${checked ? styles.checked : ''} ${dimmed ? styles.dimmed : ''}`}
      data-faction={faction.themeKey}
      data-locked={locked || undefined}
    >
      <input
        id={inputId}
        type="radio"
        name="faction"
        value={faction.slug}
        checked={checked}
        disabled={locked}
        onChange={onSelect}
        className={styles.radio}
        aria-describedby={`${inputId}-description`}
      />
      <span className={styles.media}>
        {faction.cover ? (
          // Portraits are served pre-optimised by the API.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faction.cover.src}
            srcSet={`${faction.cover.srcSmall} 432w, ${faction.cover.src} 864w`}
            sizes="(max-width: 900px) 90vw, 30vw"
            width={faction.cover.width}
            height={faction.cover.height}
            alt=""
            className={styles.portrait}
            loading="eager"
          />
        ) : null}
        <span className={styles.selectedBadge} aria-hidden="true">
          <CheckIcon size={14} strokeWidth={2.5} />
          Selected
        </span>
      </span>
      <span className={styles.body}>
        <span className={styles.metaphor}>{faction.metaphor}</span>
        <span className={styles.name}>{faction.name}</span>
        <span className={styles.tagline}>{faction.tagline}</span>
        <span id={`${inputId}-description`} className={styles.description}>
          {faction.description}
        </span>
      </span>
    </label>
  );
}
