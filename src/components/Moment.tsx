import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { GoldStar } from './Gold';
import { HeavenSky } from './Heaven';
import { celebrate, goalMoment, type Moment, onMoment } from '@/lib/moments';
import { dayKey, useProgress } from '@/lib/progress';
import { shortLink } from '@/lib/site';
import { usePrefs } from '@/lib/store';
import { fonts, usePalette } from '@/lib/theme';

const GOLD = '#B8863B';
const INK = '#1F2A36';
const W = 300; // the card on screen; saved at 1080 × 1350 like the ayah pictures

/** The picture that gets shared: no name on it, just what was read and an invitation. */
function Card({ m }: { m: Moment }) {
  return (
    <View style={styles.card}>
      <View style={styles.frame} />
      <View style={styles.frame2} />
      <View style={{ flexShrink: 0 }}>
        <GoldStar size={24} color={GOLD} />
      </View>
      <Text style={styles.eyebrow}>{m.eyebrow.toUpperCase()}</Text>
      {!!m.ar && <Text style={styles.ar}>{m.ar}</Text>}
      <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{m.title}</Text>
      {!!m.line && <Text style={styles.line}>{m.line}</Text>}
      <View style={styles.rule}>
        <View style={styles.ruleLine} />
        <GoldStar size={9} color={GOLD} />
        <View style={styles.ruleLine} />
      </View>
      <Text style={styles.quote}>“And We have certainly made the Qur’an easy for remembrance, so is there any who will remember?”</Text>
      <Text style={styles.quoteRef}>Quran 54:17</Text>
      <View style={styles.brandRow}>
        <Text style={styles.brandAr}>مُنِيب</Text>
        <Text style={styles.brand} numberOfLines={1}>Munib · {shortLink(m.link)}</Text>
      </View>
    </View>
  );
}

/**
 * Shows moments as they happen: a small gold banner while reading (tap to open), or the full screen straight away.
 * Also watches today's ayat against the reader's daily aim. Sits once, above everything, in the root layout.
 */
export function MomentHost() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const { progress } = useProgress();
  const [banner, setBanner] = useState<Moment | null>(null);
  const [full, setFull] = useState<Moment | null>(null);
  const [busy, setBusy] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onMoment((m) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (m.quiet) setBanner(m);
      else setFull(m);
    });
    return () => onMoment(null);
  }, []);

  // Today's ayat reaching the reader's own aim (from the journey questions). No streaks, nothing when it's missed.
  const today = progress.days[dayKey()] ?? 0;
  const was = useRef<number | null>(null);
  useEffect(() => {
    const goal = prefs.dailyGoal;
    if (goal > 0 && was.current != null && was.current < goal && today >= goal) celebrate(goalMoment(dayKey(), goal));
    was.current = today;
  }, [today, prefs.dailyGoal]);

  useEffect(() => {
    if (!banner) return;
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    hide.current = setTimeout(() => Animated.timing(slide, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setBanner(null)), 8000);
    return () => {
      if (hide.current) clearTimeout(hide.current);
    };
  }, [banner, slide]);

  useEffect(() => {
    if (!full) return;
    burst.setValue(0);
    Animated.timing(burst, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [full, burst]);

  const share = async () => {
    if (!full || busy) return;
    const message = `${full.share}\n${full.link}`;
    const asText = () => Share.share({ message }).catch(() => {});
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return asText();
    setBusy(true);
    try {
      const uri = await captureRef(shot as never, { format: 'png', quality: 1, width: 1080, height: 1350 });
      if (Platform.OS === 'ios') await Share.share({ url: uri, message });
      else await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: full.title });
    } catch {
      asText();
    } finally {
      setBusy(false);
    }
  };

  const name = prefs.firstName?.trim();
  return (
    <>
      {banner && !full && (
        <Animated.View
          style={[styles.banner, { bottom: insets.bottom + 92, backgroundColor: pal.dark ? '#2A2415' : '#FFFBF0', borderColor: pal.gold, opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}
        >
          <Pressable
            onPress={() => {
              setFull(banner);
              setBanner(null);
            }}
            style={styles.bannerIn}
            accessibilityRole="button"
            accessibilityLabel={`MashaAllah. ${banner.title}. Open`}
          >
            <GoldStar size={22} color={pal.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerEyebrow, { color: pal.gold }]}>MASHAALLAH</Text>
              <Text style={[styles.bannerTitle, { color: pal.text }]} numberOfLines={2}>{banner.title}</Text>
            </View>
            <Text style={[styles.bannerGo, { color: pal.gold }]}>Open</Text>
          </Pressable>
        </Animated.View>
      )}
      <Modal visible={!!full} animationType="fade" onRequestClose={() => setFull(null)} statusBarTranslucent>
        {full && (
          <View style={styles.root}>
            <HeavenSky />
            <View style={[styles.body, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}>
              <Text style={styles.hello}>{name ? `MashaAllah, ${name}` : 'MashaAllah'}</Text>
              <View style={styles.stage}>
                {/* A burst of light behind the card as it arrives. */}
                <Animated.View pointerEvents="none" style={[styles.halo, { opacity: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.55] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) }] }]}>
                  <Svg width={W * 1.7} height={W * 1.7}>
                    <Defs>
                      <RadialGradient id="moment-halo" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor="#FFE2A0" stopOpacity="0.95" />
                        <Stop offset="1" stopColor="#FFE2A0" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={W * 0.85} cy={W * 0.85} r={W * 0.85} fill="url(#moment-halo)" />
                  </Svg>
                </Animated.View>
                <Animated.View style={{ shadowColor: '#B8863B', shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6, opacity: burst.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
                  <View ref={shot} collapsable={false}>
                    <Card m={full} />
                  </View>
                </Animated.View>
              </View>
              <View style={{ gap: 10, alignSelf: 'stretch' }}>
                <Pressable onPress={share} style={({ pressed }) => [styles.primary, { opacity: pressed || busy ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityRole="button">
                  <Text style={styles.primaryText}>{busy ? 'Getting it ready…' : 'Share, and invite someone'}</Text>
                </Pressable>
                <Pressable onPress={() => setFull(null)} style={styles.ghost} accessibilityRole="button">
                  <Text style={styles.ghostText}>Carry on</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 14, right: 14, borderRadius: 20, borderWidth: 1, shadowColor: '#B8863B', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  bannerIn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  bannerEyebrow: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.4 },
  bannerTitle: { fontFamily: fonts.read, fontSize: 16, lineHeight: 21 },
  bannerGo: { fontFamily: fonts.uiBold, fontSize: 14 },
  root: { flex: 1, backgroundColor: '#FBF3E2' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  hello: { fontFamily: fonts.read, fontSize: 34, letterSpacing: -0.8, color: INK, textAlign: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  card: { width: W, height: W * 1.25, backgroundColor: '#FFFDF7', alignItems: 'center', paddingHorizontal: 26, paddingTop: 28, paddingBottom: 44, gap: 6, overflow: 'hidden' },
  frame: { position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, borderWidth: 1.2, borderColor: GOLD },
  frame2: { position: 'absolute', left: 14, right: 14, top: 14, bottom: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(184,134,59,0.55)' },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 2, color: GOLD, marginTop: 4 },
  ar: { fontFamily: fonts.arabic, fontSize: 32, lineHeight: 50, color: INK },
  title: { fontFamily: fonts.read, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, color: INK, textAlign: 'center' },
  line: { fontFamily: fonts.ui, fontSize: 12.5, color: '#6B5A3A', textAlign: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 90, marginVertical: 4 },
  ruleLine: { flex: 1, height: 1, backgroundColor: 'rgba(184,134,59,0.5)' },
  quote: { fontFamily: fonts.readItalic, fontSize: 12.5, lineHeight: 18, color: '#3B4653', textAlign: 'center' },
  quoteRef: { fontFamily: fonts.uiSemi, fontSize: 10.5, color: GOLD, letterSpacing: 0.4 },
  brandRow: { position: 'absolute', left: 0, right: 0, bottom: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  brand: { fontFamily: fonts.uiSemi, fontSize: 9.5, color: '#6B5A3A' },
  brandAr: { fontFamily: fonts.arabic, fontSize: 13, lineHeight: 20, color: GOLD },
  primary: { backgroundColor: GOLD, borderRadius: 28, minHeight: 54, alignItems: 'center', justifyContent: 'center', shadowColor: GOLD, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  primaryText: { fontFamily: fonts.uiBold, fontSize: 16, color: '#FFFFFF' },
  ghost: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontFamily: fonts.uiSemi, fontSize: 15, color: '#6B5A3A' },
});
