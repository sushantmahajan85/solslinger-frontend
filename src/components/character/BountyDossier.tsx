import { Button } from '@/components/ui/Button';
import { ArrowRightIcon } from '@/components/ui/Icons';
import type { Character } from '@/lib/types';
import styles from './Character.module.css';

export function BountyDossier({
  character,
  fileNumber,
  onClaim,
}: {
  character: Character;
  fileNumber: number;
  onClaim: () => void;
}) {
  return (
    <article className={styles.dossier} aria-labelledby="dossier-name" key={character.slug}>
      <span className={styles.dossierRivets} aria-hidden="true" />
      <header className={styles.dossierHeader}>
        <span>Bounty Dossier</span>
        <span className={styles.fileNo}>File Nº {String(fileNumber).padStart(3, '0')}</span>
      </header>

      <div className={styles.dossierScroll}>
        <div className={styles.dossierIntro}>
          <span className={styles.dossierPortrait}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.portrait.src}
              width={character.portrait.width}
              height={character.portrait.height}
              alt={character.portrait.alt}
            />
          </span>
          <div className={styles.dossierIdentity}>
            {character.faction ? (
              <p className={styles.dossierFaction}>
                <span className={styles.factionPip} aria-hidden="true" />
                {character.faction.name}
              </p>
            ) : null}
            <h2 id="dossier-name" className={styles.dossierName}>
              {character.name}
            </h2>
            <p className={styles.dossierTitle}>{character.title}</p>
          </div>
        </div>

        <section className={styles.dossierSection}>
          <h3 className={styles.dossierLabel}>Lore</h3>
          <p className={styles.dossierLore}>{character.lore}</p>
        </section>

        <section className={styles.dossierSection}>
          <h3 className={styles.dossierLabel}>Background</h3>
          <p className={styles.dossierText}>{character.background}</p>
        </section>
      </div>

      <footer className={styles.dossierFooter}>
        <Button variant="faction" size="lg" fullWidth icon={<ArrowRightIcon size={18} />} iconPosition="end" onClick={onClaim}>
          Ride as {character.name}
        </Button>
      </footer>
    </article>
  );
}
