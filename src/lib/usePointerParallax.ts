'use client';

import { useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Tracks the pointer across the viewport and writes smoothed `--px` / `--py` custom properties
 * (each -1…1, 0 at centre) onto the element, so CSS can drive 3D tilt and parallax from them.
 * Disabled under prefers-reduced-motion; the properties then stay at their 0 fallback.
 * Pass `enabled` when the element only mounts later (e.g. behind a loading state).
 */
export function usePointerParallax(ref: React.RefObject<HTMLElement | null>, enabled = true, smoothing = 0.085) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reducedMotion) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const step = () => {
      x += (targetX - x) * smoothing;
      y += (targetY - y) * smoothing;
      el.style.setProperty('--px', x.toFixed(4));
      el.style.setProperty('--py', y.toFixed(4));
      const settled = Math.abs(targetX - x) < 0.0005 && Math.abs(targetY - y) < 0.0005;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
      el.style.removeProperty('--px');
      el.style.removeProperty('--py');
    };
  }, [ref, enabled, reducedMotion, smoothing]);
}
