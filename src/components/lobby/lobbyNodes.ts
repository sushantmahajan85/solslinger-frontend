// Interactive regions of the Bloody Raven, positioned against the 1920×1080 saloon artwork.
// All values are percentages of the stage so they stay locked to the art at every size.
export type LobbyNodeId = 'slots' | 'social' | 'blackjack';

export interface LobbyNodeConfig {
  id: LobbyNodeId;
  label: string;
  area: string;
  comingSoon: string;
  /** Hit region over the environmental object. */
  region: { left: number; top: number; width: number; height: number };
  /** Plaque anchor (centre) inside the stage. */
  plaque: { x: number; y: number };
  /** Hanging signs get chains; floor plaques get a stem pointing at the object. */
  style: 'stem' | 'hanging';
  /** Pointer-parallax travel in px; matches the sprite the station sits on. */
  depth: number;
}

export const LOBBY_NODES: LobbyNodeConfig[] = [
  {
    id: 'slots',
    label: 'Slot Cabinets',
    area: 'Left corridor',
    comingSoon: 'The cabinets are still being wired. The reels start spinning soon.',
    region: { left: 5.8, top: 29, width: 22.5, height: 33 },
    plaque: { x: 17, y: 23.5 },
    style: 'stem',
    depth: 0,
  },
  {
    id: 'social',
    label: 'Shoot Your Shot',
    area: 'Social lounge',
    comingSoon: 'Gwen is still setting the bar. The social lounge opens soon.',
    region: { left: 39, top: 26, width: 22, height: 38 },
    plaque: { x: 50, y: 18 },
    style: 'hanging',
    depth: 8,
  },
  {
    id: 'blackjack',
    label: 'Blackjack Lounge',
    area: 'Right corridor',
    comingSoon: 'The dealers are still shuffling. The blackjack lounge opens soon.',
    region: { left: 74, top: 48.9, width: 22, height: 15.1 },
    plaque: { x: 85, y: 44 },
    style: 'stem',
    depth: 0,
  },
];
