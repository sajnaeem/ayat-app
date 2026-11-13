import { useLocalSearchParams } from 'expo-router';
import { QuranIndex } from '@/components/QuranIndex';

/** "Go to": opened from the surah name on a card, search, or page view's title (to=pages). */
export default function Read() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  return <QuranIndex toPages={to === 'pages'} close />;
}
