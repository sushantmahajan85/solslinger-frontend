import type { Metadata } from 'next';
import { LobbyScreen } from '@/components/lobby/LobbyScreen';

export const metadata: Metadata = { title: 'The Bloody Raven' };

export default function LobbyPage() {
  return <LobbyScreen />;
}
