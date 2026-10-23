export type FactionTheme = 'outlaws' | 'vance' | 'gamblers';

export type NextStep = 'onboarding' | 'faction' | 'character' | 'lobby';

export interface Portrait {
  src: string;
  srcSmall: string;
  width: number;
  height: number;
  alt: string;
}

export interface Faction {
  id: string;
  slug: string;
  name: string;
  metaphor: string;
  tagline: string;
  description: string;
  themeKey: FactionTheme;
  order: number;
  cover?: Portrait | null;
  characterCount?: number;
}

export interface Character {
  id: string;
  slug: string;
  name: string;
  title: string;
  lore: string;
  background: string;
  portrait: Portrait;
  faction: Pick<Faction, 'slug' | 'name' | 'metaphor' | 'themeKey'> | null;
  order: number;
}

export interface Profile {
  walletAddress: string;
  ageConfirmedAt: string | null;
  onboardingCompletedAt: string | null;
  factionLockedAt: string | null;
  characterLockedAt: string | null;
  faction: Faction | null;
  character: Character | null;
  nextStep: NextStep;
}
