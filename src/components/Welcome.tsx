import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { JourneyFlow } from '@/components/Journey';
import { SignIn } from '@/components/SignIn';
import { useAccount } from '@/lib/account';
import { ART } from '@/lib/art';
import { usePrefs } from '@/lib/store';
import { fonts } from '@/lib/theme';

/**
 * First open (Saj, 14 Nov 2026, from a screenshot of another app's welcome screen: "it should encourage us to log in
 * with the welcome screens 'Return to Allah'"): welcome → Get started (journey questions, then "save your journey"
 * sign-up) or Log in. A quiet "Not now" keeps reading open to everyone (Apple doesn't allow forcing an account for
 * things that don't need one, and Munib's rule is never a wall). Progress through it is kept in prefs.firstRun.
 */
export function FirstRun() {
  const prefs = usePrefs();
  const acct = useAccount();
  const step = prefs.firstRun ?? 'welcome';
  const signedIn = acct.status === 'signedIn';
  const go = (firstRun: NonNullable<typeof prefs.firstRun>) => prefs.set({ firstRun });

  // Signing in moves on by itself (the name screen comes first if needed, from _layout).
  useEffect(() => {
    if (!signedIn) return;
    if (step === 'signin') go(prefs.journey || prefs.journeySkipped ? 'done' : 'journey');
    if (step === 'save') go('done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, step]);

  if (step === 'signin') return <SignIn reason="Welcome back. Sign in to pick up where you left off: your progress, saved ayat and reading groups." onClose={() => go('welcome')} />;
  if (step === 'journey') return <JourneyFlow startAt={1} onBack={() => go('welcome')} onDone={() => go(signedIn ? 'done' : 'save')} />;
  if (step === 'save')
    return <SignIn reason="Your Munib is ready. Create a free account so your journey, progress and saved ayat are kept safe, on this phone and any other." onClose={() => go('done')} />;
  return (
    <Welcome
      onStart={() => go('journey')}
      onLogin={() => go('signin')}
      onBrowse={() => prefs.set({ firstRun: 'done', journeySkipped: true })}
    />
  );
}

const LINES = ['Return', 'to Allah,', 'a little more', 'every day'];
// Positions as fractions of the screen, in the open sky between the words and the mosque.
const CHIPS = [
  { label: 'The Quran, one ayah at a time', top: 0.385, left: 0.06, rot: '-3deg' },
  { label: 'Learn to pray', top: 0.435, left: 0.5, rot: '4deg' },
  { label: 'Read together', top: 0.475, left: 0.12, rot: '-2deg' },
];

function Welcome({ onStart, onLogin, onBrowse }: { onStart: () => void; onLogin: () => void; onBrowse: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 520);
  const lines = useRef(LINES.map(() => new Animated.Value(0))).current;
  const extras = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.stagger(240, lines.map((v) => Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }))),
      Animated.timing(extras, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const float = (k: number) => ({ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, k] }) }] });
  const size = Math.min(52, height * 0.06);

  return (
    <ImageBackground source={require('../../assets/art/sky/welcome.jpg')} style={styles.root} imageStyle={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors>
      {/* Deep emerald at the top melting into the sunset, and darker again under the buttons */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B3A2D" stopOpacity="1" />
            <Stop offset="0.3" stopColor="#0B3A2D" stopOpacity="0.95" />
            <Stop offset="0.5" stopColor="#0B3A2D" stopOpacity="0.25" />
            <Stop offset="0.7" stopColor="#0B3A2D" stopOpacity="0" />
            <Stop offset="1" stopColor="#061E17" stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#top)" />
      </Svg>

      <View style={{ paddingTop: insets.top + 30, paddingHorizontal: 26 }}>
        {LINES.map((l, i) => (
          <Animated.Text
            key={l}
            style={[
              styles.line,
              { fontSize: size, lineHeight: size * 1.15 },
              { alignSelf: i % 2 ? 'flex-end' : 'flex-start', opacity: lines[i].interpolate({ inputRange: [0, 1], outputRange: [0, i === 3 ? 0.72 : 1] }), transform: [{ translateY: lines[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
            ]}
          >
            {l}
          </Animated.Text>
        ))}
        <Animated.View style={{ opacity: extras, marginTop: 14 }}>
          <Text style={styles.meaning}>
            <Text style={styles.arabic}>مُنِيب </Text> Munib: one who turns back to Allah (Quran 50:33)
          </Text>
        </Animated.View>

      </View>

      {/* Floating objects and features */}
      <Animated.View style={[styles.sticker, { top: insets.top + 8, right: 20, opacity: extras }, float(-8)]} pointerEvents="none">
        <Image source={ART.crescent} style={{ width: 56, height: 56 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[styles.sticker, { top: height * 0.37, right: 16, opacity: extras }, float(7)]} pointerEvents="none">
        <Image source={ART.star8} style={{ width: 46, height: 46 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[styles.sticker, { top: height * 0.53, right: 22, opacity: extras }, float(-6)]} pointerEvents="none">
        <Image source={ART.beads} style={{ width: 44, height: 44 }} resizeMode="contain" />
      </Animated.View>
      {CHIPS.map((c, i) => (
        <Animated.View
          key={c.label}
          pointerEvents="none"
          style={[styles.chip, { top: height * c.top, left: w * c.left, opacity: extras, transform: [{ rotate: c.rot }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 ? 4 : -4] }) }] }]}
        >
          <Text style={styles.chipText}>{c.label}</Text>
        </Animated.View>
      ))}

      <View style={{ flex: 1 }} />
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
          <Text style={styles.primaryText}>Get started</Text>
        </Pressable>
        <Pressable onPress={onLogin} style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
          <Text style={styles.secondaryText}>Log in</Text>
        </Pressable>
        <Pressable onPress={onBrowse} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <Text style={styles.browse}>Not now, just let me read</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B3A2D' },
  line: { fontFamily: fonts.read, letterSpacing: -1.4, color: '#F4F0E6' },
  meaning: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: 'rgba(244,240,230,0.82)' },
  arabic: { fontFamily: fonts.arabic, fontSize: 18, color: '#F4F0E6' },
  sticker: { position: 'absolute' },
  chip: { position: 'absolute', backgroundColor: 'rgba(6,30,23,0.55)', borderColor: 'rgba(255,255,255,0.22)', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13, color: '#F4F0E6' },
  buttons: { paddingHorizontal: 20, gap: 10 },
  primary: { backgroundColor: '#FBF8F1', borderRadius: 20, paddingVertical: 18, alignItems: 'center' },
  primaryText: { fontFamily: fonts.uiSemi, fontSize: 17, color: '#14181A' },
  secondary: { backgroundColor: '#17795A', borderRadius: 20, paddingVertical: 18, alignItems: 'center' },
  secondaryText: { fontFamily: fonts.uiSemi, fontSize: 17, color: '#FFFFFF' },
  browse: { fontFamily: fonts.ui, fontSize: 13.5, color: 'rgba(244,240,230,0.78)', textDecorationLine: 'underline' },
});
