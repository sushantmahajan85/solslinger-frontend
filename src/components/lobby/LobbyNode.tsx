import type { LobbyNodeConfig, LobbyNodeId } from './lobbyNodes';
import styles from './Lobby.module.css';

const NODE_CLASS: Record<LobbyNodeId, string> = { slots: 'nodeSlots', social: 'nodeSocial', blackjack: 'nodeBlackjack' };
// Staggers the idle animations so the three stations never pulse in unison.
const NODE_DELAY: Record<LobbyNodeId, string> = { slots: '0s', social: '-1.4s', blackjack: '-2.6s' };

export function LobbyNode({
  node,
  active,
  onActiveChange,
  onActivate,
}: {
  node: LobbyNodeConfig;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onActivate: () => void;
}) {
  const { region, plaque } = node;
  return (
    <button
      type="button"
      className={`${styles.node} ${styles[NODE_CLASS[node.id]]}`}
      data-active={active || undefined}
      style={
        {
          left: `${region.left}%`,
          top: `${region.top}%`,
          width: `${region.width}%`,
          height: `${region.height}%`,
          // Plaque position expressed relative to this region.
          '--plaque-x': `${((plaque.x - region.left) / region.width) * 100}%`,
          '--plaque-y': `${((plaque.y - region.top) / region.height) * 100}%`,
          '--depth': node.depth,
          '--delay': NODE_DELAY[node.id],
        } as React.CSSProperties
      }
      aria-label={`${node.label}, ${node.area}. Coming soon.`}
      onPointerEnter={() => onActiveChange(true)}
      onPointerLeave={() => onActiveChange(false)}
      onFocus={() => onActiveChange(true)}
      onBlur={() => onActiveChange(false)}
      onClick={onActivate}
    >
      <span className={styles.regionGlow} aria-hidden="true" />
      <span className={`${styles.plaque} ${node.style === 'hanging' ? styles.hanging : styles.stem}`} aria-hidden="true">
        <span className={styles.plaqueGlow} />
        <span className={styles.pip} />
        <span className={styles.plaqueText}>
          <span className={styles.plaqueLabel}>{node.label}</span>
          <span className={styles.plaqueArea}>{node.area}</span>
        </span>
      </span>
    </button>
  );
}
