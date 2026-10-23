import type { MusicStatus } from './useLobbyMusic';
import styles from '../Lobby.module.css';

const LABEL: Record<MusicStatus, string> = {
  idle: 'Music',
  waiting: 'Tap for music',
  playing: 'Music on',
  muted: 'Music off',
};

export function MusicToggle({ status, onToggle }: { status: MusicStatus; onToggle: () => void }) {
  const on = status === 'playing';
  return (
    <button
      type="button"
      className={styles.music}
      data-status={status}
      data-music-toggle
      aria-pressed={on}
      aria-label={on ? 'Mute music' : 'Play music'}
      title={`${on ? 'Mute' : 'Play'} music (M)`}
      onClick={onToggle}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
        {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      </svg>
      <span className={styles.eq} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className={styles.musicLabel}>{LABEL[status]}</span>
    </button>
  );
}
