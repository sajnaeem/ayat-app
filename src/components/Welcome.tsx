import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { JourneyFlow } from '@/components/Journey';
import { SignIn } from '@/components/SignIn';
import { useAccount } from '@/lib/account';
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

  if (step === 'signin') return <SignIn heaven reason="Welcome back. Sign in to pick up where you left off: your progress, saved ayat and reading groups." onClose={() => go('welcome')} />;
  if (step === 'journey') return <JourneyFlow startAt={1} onBack={() => go('welcome')} onDone={() => go(signedIn ? 'done' : 'save')} />;
  if (step === 'save')
    return (
      <SignIn
        heaven
        reason={`${prefs.firstName ? `${prefs.firstName}, your` : 'Your'} Munib is ready. Create a free account so your journey, progress and saved ayat are kept safe, on this phone and any other.`}
        onClose={() => go('done')}
      />
    );
  return (
    <Welcome
      onStart={() => go('journey')}
      onLogin={() => go('signin')}
      onBrowse={() => prefs.set({ firstRun: 'done', journeySkipped: true })}
    />
  );
}

const LINES = ['Return', 'to Allah,', 'a little more', 'every day'];
const CHIPS = ['The Quran, one ayah at a time', 'Learn to pray', 'Read together'];
// Points of light that twinkle in the open sky (fractions of the screen).
const SPARKS = [
  [0.12, 0.06, 3], [0.82, 0.05, 2], [0.55, 0.11, 2.5], [0.3, 0.2, 2], [0.92, 0.17, 3], [0.07, 0.31, 2.5],
  [0.62, 0.36, 2], [0.2, 0.4, 3], [0.88, 0.42, 2], [0.45, 0.03, 2], [0.72, 0.25, 2.5], [0.38, 0.33, 2],
];

function Welcome({ onStart, onLogin, onBrowse }: { onStart: () => void; onLogin: () => void; onBrowse: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const k = Math.max(width / 750, height / 1625);
  const bg = { w: 750 * k, h: 1625 * k };
  const lines = useRef(LINES.map(() => new Animated.Value(0))).current;
  const extras = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(SPARKS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loop = (v: Animated.Value, ms: number, delay = 0) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    Animated.sequence([
      Animated.delay(250),
      Animated.stagger(260, lines.map((v) => Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }))),
      Animated.timing(extras, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    // the scene drifts slowly closer, like a camera moving towards the mosque
    Animated.timing(zoom, { toValue: 1, duration: 22000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    loop(glow, 2400);
    twinkle.forEach((v, i) => loop(v, 1300 + (i % 4) * 450, i * 280));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const size = Math.min(50, height * 0.058);
  const gold = { color: '#F5CD7A', textShadowColor: 'rgba(255,190,90,0.75)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } };

  return (
    <View style={styles.root}>
      {/* Cover the screen, but crop more from the dark ground than from the sky so the moon stays in view */}
      <Animated.Image
        source={require('../../assets/art/sky/welcome.jpg')}
        style={{ position: 'absolute', left: (width - bg.w) / 2, top: (height - bg.h) * 0.3, width: bg.w, height: bg.h, transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }, { translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      {/* Night falling from the top so the words read, and deep emerald under the buttons */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#030716" stopOpacity="0.22" />
            <Stop offset="0.26" stopColor="#030716" stopOpacity="0.2" />
            <Stop offset="0.42" stopColor="#030716" stopOpacity="0" />
            <Stop offset="0.66" stopColor="#04120F" stopOpacity="0" />
            <Stop offset="0.8" stopColor="#04120F" stopOpacity="0.82" />
            <Stop offset="1" stopColor="#04120F" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#shade)" />
      </Svg>

      {SPARKS.map(([x, y, r], i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{ position: 'absolute', left: `${x * 100}%`, top: height * y, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: '#FFF6DD', shadowColor: '#FFE7A8', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, opacity: twinkle[i].interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }), transform: [{ scale: twinkle[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] }) }] }}
        />
      ))}

      <View style={{ paddingTop: insets.top + 26, paddingHorizontal: 26 }}>
        {LINES.map((l, i) => (
          <Animated.Text
            key={l}
            style={[
              styles.line,
              { fontSize: size, lineHeight: size * 1.14 },
              { alignSelf: i % 2 ? 'flex-end' : 'flex-start', opacity: lines[i].interpolate({ inputRange: [0, 1], outputRange: [0, i === 3 ? 0.78 : 1] }), transform: [{ translateY: lines[i].interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] },
            ]}
          >
            {i === 1 ? (
              <>
                to <Text style={gold}>Allah</Text>,
              </>
            ) : (
              l
            )}
          </Animated.Text>
        ))}
        <Animated.View style={{ opacity: extras, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Animated.Text style={[styles.arabic, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]}>مُنِيب</Animated.Text>
          <Text style={styles.meaning}>Munib: one who turns back{'\n'}to Allah (Quran 50:33)</Text>
        </Animated.View>
      </View>

      <View style={{ flex: 1 }} />
      {height >= 760 && <Animated.View style={[styles.chips, { opacity: extras, transform: [{ translateY: extras.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]} pointerEvents="none">
        {CHIPS.map((c) => (
          <View key={c} style={styles.chip}>
            <View style={styles.dot} />
            <Text style={styles.chipText}>{c}</Text>
          </View>
        ))}
      </Animated.View>}
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.88 : 1 }]} accessibilityRole="button">
          <Text style={styles.primaryText}>Get started</Text>
        </Pressable>
        <Pressable onPress={onLogin} style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
          <Text style={styles.secondaryText}>Log in</Text>
        </Pressable>
        <Pressable onPress={onBrowse} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <Text style={styles.browse}>Not now, just let me read</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040818', overflow: 'hidden' },
  line: { fontFamily: fonts.read, letterSpacing: -1.4, color: '#F7F3EA', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  meaning: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19, color: 'rgba(247,243,234,0.8)' },
  arabic: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 50, color: '#F5CD7A', textShadowColor: 'rgba(255,190,90,0.6)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 18, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.24)', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5CD7A' },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 12.5, color: '#F7F3EA' },
  buttons: { paddingHorizontal: 20, gap: 10 },
  primary: { backgroundColor: '#F5CD7A', borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: '#F5B84A', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 4 } },
  primaryText: { fontFamily: fonts.uiBold, fontSize: 17, color: '#1A1408' },
  secondary: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderRadius: 20, paddingVertical: 17, alignItems: 'center' },
  secondaryText: { fontFamily: fonts.uiSemi, fontSize: 17, color: '#FFFFFF' },
  browse: { fontFamily: fonts.ui, fontSize: 13.5, color: 'rgba(247,243,234,0.75)', textDecorationLine: 'underline' },
});
