import { useRouter } from 'expo-router';
import { JourneyFlow } from '@/components/Journey';

/** Retake the first-open questions (You → Your journey). */
export default function JourneyScreen() {
  const router = useRouter();
  return <JourneyFlow onDone={() => router.back()} />;
}
