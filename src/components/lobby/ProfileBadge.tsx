/* eslint-disable @next/next/no-img-element -- portrait is served pre-optimised by the API */
import { WalletChip } from '@/components/wallet/WalletChip';
import type { Profile } from '@/lib/types';
import styles from './Lobby.module.css';

export function ProfileBadge({ profile }: { profile: Profile }) {
  const { character, faction } = profile;
  if (!character || !faction) return null;
  return (
    <div className={styles.profile}>
      <div className={styles.identity}>
        <span className={styles.avatar}>
          <img src={character.portrait.srcSmall} alt="" width={432} height={592} />
        </span>
        <span className={styles.identityText}>
          <span className={styles.identityName}>{character.name}</span>
          <span className={styles.identityFaction}>
            <span className={styles.factionPip} aria-hidden="true" />
            {faction.name}
          </span>
        </span>
      </div>
      <WalletChip />
    </div>
  );
}
