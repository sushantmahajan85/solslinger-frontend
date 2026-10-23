import type { Character } from '@/lib/types';
import styles from './Character.module.css';

export function CharacterCard({
  character,
  checked,
  priority,
  onSelect,
}: {
  character: Character;
  checked: boolean;
  priority?: boolean;
  onSelect: () => void;
}) {
  const inputId = `character-${character.slug}`;
  return (
    <label htmlFor={inputId} className={`${styles.card} ${checked ? styles.checked : ''}`}>
      <input
        id={inputId}
        type="radio"
        name="character"
        value={character.slug}
        checked={checked}
        onChange={onSelect}
        className={styles.radio}
      />
      <span className={styles.frame}>
        {/* Portraits are served pre-optimised by the API; their 3:4 ratio is preserved, never cropped. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={character.portrait.srcSmall}
          srcSet={`${character.portrait.srcSmall} 432w, ${character.portrait.src} 864w`}
          sizes="(max-width: 900px) 45vw, 200px"
          width={character.portrait.width}
          height={character.portrait.height}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          className={styles.cardImage}
        />
      </span>
      <span className={styles.cardName}>{character.name}</span>
      <span className={styles.cardTitle}>{character.title}</span>
    </label>
  );
}
