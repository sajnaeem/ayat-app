import { useLocalSearchParams, useRouter } from 'expo-router';
import { SignIn } from '@/components/SignIn';

const REASONS: Record<string, string> = {
  foryou: 'Create a free account for For you: ayat picked for how you feel, plus your progress saved.',
  you: 'Create a free account to keep your progress, saved ayat and reminders.',
  reflect: 'Create a free account to read and share reflections.',
};

/** Sign-in, opened from the Quran tab when someone wants something that needs an account. */
export default function SignInScreen() {
  const router = useRouter();
  const { why } = useLocalSearchParams<{ why?: string }>();
  return <SignIn reason={REASONS[why ?? ''] ?? undefined} onClose={() => router.back()} />;
}
