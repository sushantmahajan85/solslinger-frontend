'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileMusic, createSaloonMusic, type MusicEngine } from './saloonMusic';

const MUTE_KEY = 'solslinger.music-muted';
// The bundled soundtrack; NEXT_PUBLIC_LOBBY_MUSIC_URL overrides it.
const MUSIC_URL = process.env.NEXT_PUBLIC_LOBBY_MUSIC_URL || '/music/cowboy-countryside-music.mp3';

/** idle: not started · waiting: browser needs a first click/tap · playing · muted */
export type MusicStatus = 'idle' | 'waiting' | 'playing' | 'muted';

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Preference simply won't persist.
  }
}

/**
 * Lobby soundtrack: on by default, remembers a mute per device, starts on the first
 * user gesture when autoplay is blocked, fades out while the tab is hidden, and
 * toggles with the M key.
 */
export function useLobbyMusic(enabled: boolean) {
  const [status, setStatus] = useState<MusicStatus>('idle');
  const ctxRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<MusicEngine | null>(null);
  const mutedRef = useRef(false);
  const suspendTimer = useRef<number | undefined>(undefined);

  const fadeOutAndSuspend = useCallback(() => {
    engineRef.current?.setAudible(false);
    window.clearTimeout(suspendTimer.current);
    suspendTimer.current = window.setTimeout(() => void ctxRef.current?.suspend(), 700);
  }, []);

  const fadeIn = useCallback(async () => {
    window.clearTimeout(suspendTimer.current);
    const ctx = ctxRef.current;
    if (!ctx) return false;
    await ctx.resume().catch(() => undefined);
    if (ctx.state !== 'running') return false;
    engineRef.current?.setAudible(true);
    return true;
  }, []);

  /** Creates the audio graph on first use; must run inside (or after) a user gesture. */
  const start = useCallback(async () => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume().catch(() => undefined);
      if (ctx.state !== 'running') return false;
      engineRef.current = MUSIC_URL ? createFileMusic(ctx, MUSIC_URL) : createSaloonMusic(ctx);
      return true;
    }
    return fadeIn();
  }, [fadeIn]);

  useEffect(() => {
    if (!enabled) return;
    mutedRef.current = readMuted();
    let cancelled = false;

    const waitForGesture = () => {
      setStatus('waiting');
      const onGesture = (event: Event) => {
        // The toggle button handles its own click.
        if ((event.target as Element | null)?.closest?.('[data-music-toggle]')) return;
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
        if (cancelled || mutedRef.current) return;
        void start().then((ok) => !cancelled && setStatus(ok ? 'playing' : 'waiting'));
      };
      window.addEventListener('pointerdown', onGesture);
      window.addEventListener('keydown', onGesture);
      return () => {
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
      };
    };

    let removeGesture: (() => void) | undefined;
    if (mutedRef.current) {
      setStatus('muted');
    } else if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      // Avoid creating an AudioContext the browser would refuse; start on the first interaction.
      removeGesture = waitForGesture();
    } else {
      void start().then((ok) => {
        if (cancelled) return;
        if (ok) setStatus('playing');
        else removeGesture = waitForGesture();
      });
    }

    const onVisibility = () => {
      if (mutedRef.current || !engineRef.current) return;
      if (document.hidden) fadeOutAndSuspend();
      else void fadeIn();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      removeGesture?.();
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(suspendTimer.current);
      engineRef.current?.destroy();
      engineRef.current = null;
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    };
  }, [enabled, start, fadeIn, fadeOutAndSuspend]);

  const toggle = useCallback(async () => {
    // Not muted but not yet sounding (autoplay was blocked): this click starts it.
    if (!mutedRef.current && ctxRef.current?.state !== 'running') {
      setStatus((await start()) ? 'playing' : 'waiting');
      return;
    }
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    writeMuted(nextMuted);
    if (nextMuted) {
      fadeOutAndSuspend();
      setStatus('muted');
    } else {
      setStatus((await start()) ? 'playing' : 'waiting');
    }
  }, [start, fadeOutAndSuspend]);

  // Keyboard shortcut: M toggles the music (ignored while typing or with modifiers).
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'm' || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      void toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, toggle]);

  return { status, toggle };
}
