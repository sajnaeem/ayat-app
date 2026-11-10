import { useLocalSearchParams, useRouter } from 'expo-router';
import { SignIn } from '@/components/SignIn';

const REASONS: Record<string, string> = {
  foryou: 'Create a free account for For you: ayat picked for how you feel, plus your progress saved.',
  you: 'Create a free account to keep your progress, saved ayat and reminders.',
  reflect: 'Create a free account to read and share reflections.',
  ask: 'Create a free account to ask questions about any ayah.',
  mosque: 'Create a free account to add your mosque and get alerts before each jama’ah.',
  keep: 'Create a free account to keep your saved ayat and your place, and to ask about any ayah.',
};

/** Sign-in, opened from the Quran tab when someone wants something that needs an account. */
export default function SignInScreen() {
  const router = useRouter();
  const { why } = useLocalSearchParams<{ why?: string }>();
  return <SignIn reason={REASONS[why ?? ''] ?? undefined} onClose={() => router.back()} />;
}
