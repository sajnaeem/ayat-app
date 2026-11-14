import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useAccount } from '@/lib/account';
import { usePalette } from '@/lib/theme';

/**
 * The way to your own page (You), now that Ask has its place in the tab bar (Saj, 14 Nov 2026):
 * your initial when signed in, a person icon otherwise. Sits at the top right of Home, Ask and Together.
 */
export function MeButton({ size = 34, light }: { size?: number; /** on a dark picture */ light?: boolean }) {
  const pal = usePalette();
  const router = useRouter();
  const acct = useAccount();
  const signedIn = acct.status === 'signedIn' && !!acct.userId;
  return (
    <Pressable onPress={() => router.navigate('/you')} hitSlop={8} accessibilityRole="button" accessibilityLabel="You: your profile, progress and settings">
      {signedIn ? (
        <Avatar id={acct.userId!} name={acct.handle ?? '?'} size={size} />
      ) : (
        <View style={[styles.empty, { width: size, height: size, borderRadius: size / 2, borderColor: light ? 'rgba(255,255,255,0.6)' : pal.line, backgroundColor: light ? 'rgba(0,0,0,0.2)' : pal.surface }]}>
          <Icon name="user" size={size * 0.5} color={light ? '#FFFFFF' : pal.text} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
