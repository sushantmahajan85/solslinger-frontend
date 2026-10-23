import type { Metadata } from 'next';
import { CharacterScreen } from '@/components/character/CharacterScreen';

export const metadata: Metadata = { title: 'Claim your identity' };

export default function CharacterPage() {
  return <CharacterScreen />;
}
