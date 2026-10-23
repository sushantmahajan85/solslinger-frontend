import type { Metadata } from 'next';
import { FactionScreen } from '@/components/faction/FactionScreen';

export const metadata: Metadata = { title: 'Choose your faction' };

export default function FactionPage() {
  return <FactionScreen />;
}
