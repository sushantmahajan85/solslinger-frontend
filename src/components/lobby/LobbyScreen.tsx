'use client';

/* eslint-disable @next/next/no-img-element -- scene art is pre-optimised and must keep exact geometry */

import { useRef, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useJourneyGuard, useSession } from '@/lib/session';
import { usePointerParallax } from '@/lib/usePointerParallax';
import { MusicToggle } from './audio/MusicToggle';
import { useLobbyMusic } from './audio/useLobbyMusic';
import { LobbyNode } from './LobbyNode';
import { LOBBY_NODES, type LobbyNodeId } from './lobbyNodes';
import { ProfileBadge } from './ProfileBadge';
import styles from './Lobby.module.css';

// Lantern centres in the saloon artwork, as % of the stage.
const LANTERNS: [number, number][] = [
  [14.6, 21],
  [34.4, 26.5],
  [65.9, 26.5],
  [85.7, 20.5],
];

export function LobbyScreen() {
  const allowed = useJourneyGuard('lobby');
  const { profile } = useSession();
  const toast = useToast();
  const [active, setActive] = useState<LobbyNodeId | null>(null);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const viewportRef = useRef<HTMLDivElement>(null);
  const ready = allowed && Boolean(profile?.faction && profile.character);
  usePointerParallax(viewportRef, ready);
  const music = useLobbyMusic(ready);

  if (!ready || !profile?.faction || !profile.character) {
    return (
      <div className={styles.pending}>
        <Spinner size={22} label="Loading" />
      </div>
    );
  }

  // Fade the room in only once the background and hostess are decoded; cached images may
  // already be complete before React attaches onLoad, so check on mount as well.
  const track = (key: string) => ({
    onLoad: () => setLoaded((set) => new Set(set).add(key)),
    ref: (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0 && !loaded.has(key)) setLoaded((set) => new Set(set).add(key));
    },
  });
  const firstName = profile.character.name.split(' ')[0];

  return (
    <div ref={viewportRef} className={styles.viewport} data-faction={profile.faction.themeKey}>
      <h1 className="visually-hidden">The Bloody Raven</h1>

      <div className={`${styles.stage} ${loaded.size >= 2 ? styles.ready : ''}`}>
        {/* The art box overhangs the stage so the blur's soft edge falls outside the visible frame. */}
        <div className={styles.artBox}>
          <div className={styles.background} aria-hidden="true">
            <img src="/scene/saloon.webp" alt="" width={1920} height={1080} fetchPriority="high" {...track('saloon')} />
          </div>
          <div className={styles.wings} aria-hidden="true">
            <img src="/scene/saloon.webp" alt="" width={1920} height={1080} className={styles.wingLeft} />
            <img src="/scene/saloon.webp" alt="" width={1920} height={1080} className={styles.wingRight} />
          </div>
          <div className={styles.lighting} aria-hidden="true" />
          {/* Warm light pooling under the saloon's lanterns, flickering independently. */}
          <div className={styles.lanterns} aria-hidden="true">
            {LANTERNS.map(([x, y], i) => (
              <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * -1.3}s` }} />
            ))}
          </div>

          <div className={styles.slotSprites} data-active={active === 'slots' || undefined} aria-hidden="true">
            <div className={`${styles.cabinet} ${styles.slotBack}`}>
              <img src="/scene/slot-dead-ringers.webp" alt="" width={560} height={868} />
            </div>
            <div className={`${styles.cabinet} ${styles.slotFront}`}>
              <img src="/scene/slot-solslinger.webp" alt="" width={560} height={879} />
            </div>
          </div>

          <img
            src="/scene/hostess.webp"
            alt=""
            aria-hidden="true"
            width={1200}
            height={1600}
            className={styles.hostess}
            data-active={active === 'social' || undefined}
            fetchPriority="high"
            {...track('hostess')}
          />

          <nav className={styles.nodes} aria-label="Saloon stations">
            {LOBBY_NODES.map((node) => (
              <LobbyNode
                key={node.id}
                node={node}
                active={active === node.id}
                onActiveChange={(isActive) => setActive((current) => (isActive ? node.id : current === node.id ? null : current))}
                onActivate={() =>
                  toast.show({
                    tone: 'coming-soon',
                    eyebrow: 'Coming soon',
                    title: node.label,
                    message: node.comingSoon,
                    duration: 5200,
                  })
                }
              />
            ))}
          </nav>
        </div>
      </div>

      <header className={styles.hud}>
        <div className={styles.place}>
          <BrandMark href={null} compact />
          <span className={styles.placeDivider} aria-hidden="true" />
          <span className={styles.placeName}>The Bloody Raven</span>
        </div>
        <ProfileBadge profile={profile} />
      </header>

      <div className={styles.footerBar}>
        <MusicToggle status={music.status} onToggle={() => void music.toggle()} />
        <p className={styles.hint}>Welcome in, {firstName}. Choose a lit station to explore.</p>
      </div>
    </div>
  );
}
