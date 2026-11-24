import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { ExplainIntro } from '@/components/Explain';
import { Icon } from '@/components/Icon';
import { EMERALD, GOLD, GOLD_DEEP, GOLD_LIGHT, jewel, JewelGround, jewelPalette, star8 } from '@/components/Jewel';
import { TasbeehShare } from '@/components/TasbeehShare';
import { usePrefs } from '@/lib/store';
import { fonts, usePalette } from '@/lib/theme';

/**
 * Tasbeeh: a counter for dhikr. Tap anywhere on the ring of beads; each tap lights the next bead and the phone gives
 * a small tap, with a stronger one at the target. Counts stay on the phone.
 * Look (Saj, 15 Nov 2026: "visually striking"): an emerald ground lit from above, a misbaha of pearl beads that turn
 * gold one by one, the phrase in gold, a ripple of light on every count.
 * Phrases and the after-prayer set (33 · 33 · 34, Sahih Muslim 596) need a scholar's check like all Arabic in Munib.
 */
export const PHRASES = [
  { id: 'subhanallah', ar: 'سُبْحَانَ ٱللَّهِ', tl: 'SubhanAllah', en: 'Glory be to Allah' },
  { id: 'alhamdulillah', ar: 'ٱلْحَمْدُ لِلَّهِ', tl: 'Alhamdulillah', en: 'All praise is for Allah' },
  { id: 'allahuakbar', ar: 'ٱللَّهُ أَكْبَرُ', tl: 'Allahu Akbar', en: 'Allah is the Greatest' },
  { id: 'lailaha', ar: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ', tl: 'La ilaha illallah', en: 'There is no god but Allah' },
  { id: 'astaghfirullah', ar: 'أَسْتَغْفِرُ ٱللَّهَ', tl: 'Astaghfirullah', en: 'I seek Allah’s forgiveness' },
  { id: 'bihamdihi', ar: 'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ', tl: 'SubhanAllahi wa bihamdihi', en: 'Glory be to Allah, and praise Him' },
  { id: 'salawat', ar: 'ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', tl: 'Allahumma salli ʿala Muhammad', en: 'O Allah, send blessings on Muhammad' },
];
// After each prayer: 33 SubhanAllah, 33 Alhamdulillah, 34 Allahu Akbar (Sahih Muslim 596).
const SET = [
  { id: 'subhanallah', n: 33 },
  { id: 'alhamdulillah', n: 33 },
  { id: 'allahuakbar', n: 34 },
];
const TARGETS = [33, 99, 100, 0]; // 0 = no target
const today = () => new Date().toISOString().slice(0, 10);

export default function Tasbeeh() {
  const pal = jewelPalette(usePalette());
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const prefs = usePrefs();
  const t = prefs.tasbeeh;
  const phrase = PHRASES.find((p) => p.id === t.phrase) ?? PHRASES[0];
  const setIx = t.set ? SET.findIndex((x) => x.id === t.phrase) : -1;
  const todayCount = t.day === today() ? t.today : 0;
  const ripple = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const [sharing, setSharing] = useState(false);

  const save = (x: Partial<typeof t>) => prefs.set({ tasbeeh: { ...t, ...x } });

  const pulse = () => {
    ripple.setValue(0);
    Animated.timing(ripple, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    pop.setValue(1.09);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  };
  const tap = () => {
    pulse();
    const count = t.count + 1;
    const base = { day: today(), today: todayCount + 1, total: t.total + 1 };
    if (t.target && count >= t.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // In the after-prayer set, move on to the next phrase; otherwise stay at the target until reset.
      if (t.set && setIx >= 0 && setIx < SET.length - 1) {
        const next = SET[setIx + 1];
        save({ ...base, phrase: next.id, target: next.n, count: 0 });
        return;
      }
      if (count > t.target) {
        // Tapping on after the target starts a new round.
        save({ ...base, count: 1 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
    } else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    save({ ...base, count });
  };
  const reset = () => save(t.set ? { phrase: SET[0].id, target: SET[0].n, count: 0 } : { count: 0 });
  const done = !!t.target && t.count >= t.target;
  const setDone = t.set && setIx === SET.length - 1 && done;

  /* ---------- The misbaha: a ring of beads, with the leader bead and star at the top ---------- */
  const size = Math.min(width - 36, height * 0.42, 350);
  const c = size / 2;
  const beads = t.target && t.target <= 34 ? t.target : 33;
  const lit = done ? beads : t.count === 0 ? 0 : ((t.count - 1) % beads) + 1;
  const rounds = t.target > 34 ? Math.ceil(t.target / beads) : 0;
  const round = rounds ? Math.min(rounds, Math.floor(Math.max(0, t.count - 1) / beads) + 1) : 0;
  const ringR = c - 16;
  const beadR = Math.min(11.5, ((Math.PI * 2 * ringR) / (beads + 1)) * 0.42);
  const at = (i: number) => {
    const a = (-90 + ((i + 1) * 360) / (beads + 1)) * (Math.PI / 180);
    return { x: c + Math.cos(a) * ringR, y: c + Math.sin(a) * ringR };
  };
  const inner = ringR - beadR - 16;

  return (
    <View style={styles.root}>
      <JewelGround look={EMERALD} />
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>Tasbeeh</Text>
          <Text style={styles.sub}>Remember Allah, one bead at a time</Text>
        </View>
        <Pressable onPress={() => router.back()} style={[jewel.glass, jewel.round]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <ExplainIntro id="dhikr" pal={pal} style={{ marginHorizontal: 18, marginTop: 4, marginBottom: 2 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="After prayer" on={t.set} onPress={() => save({ set: true, phrase: SET[0].id, target: SET[0].n, count: 0 })} />
          {PHRASES.map((p) => (
            <Chip key={p.id} label={p.tl} on={!t.set && p.id === t.phrase} onPress={() => save({ set: false, phrase: p.id, count: 0, target: t.set ? 33 : t.target })} />
          ))}
        </ScrollView>

        <View style={{ alignItems: 'center', paddingHorizontal: 24, marginTop: 2 }}>
          <Text style={styles.ar}>{phrase.ar}</Text>
          <Text style={styles.tl}>{phrase.tl}</Text>
          <Text style={styles.en}>{phrase.en}</Text>
          {t.set && (
            <View style={styles.setRow}>
              {SET.map((x, i) => {
                const past = i < setIx || setDone;
                const now = i === setIx && !setDone;
                return (
                  <View key={x.id} style={[styles.setPill, past && { backgroundColor: GOLD, borderColor: GOLD }, now && { borderColor: GOLD }]}>
                    <Text style={[styles.setText, past && { color: '#1D1503' }, now && { color: GOLD }]}>
                      {past ? '✓ ' : ''}
                      {x.n}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          onPress={tap}
          style={[styles.counter, { width: size, height: size }]}
          accessibilityRole="button"
          accessibilityLabel={`Count. ${t.count}${t.target ? ` of ${t.target}` : ''}`}
        >
          {/* A ripple of light on every count */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ripple,
              { width: inner * 2, height: inner * 2, borderRadius: inner, left: c - inner, top: c - inner },
              { opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.32] }) }] },
            ]}
          />
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="pearl" cx="36%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
                <Stop offset="0.55" stopColor="#CFEBDD" stopOpacity={0.5} />
                <Stop offset="1" stopColor="#7FBFA5" stopOpacity={0.28} />
              </RadialGradient>
              <RadialGradient id="goldBead" cx="36%" cy="30%" r="75%">
                <Stop offset="0" stopColor={GOLD_LIGHT} />
                <Stop offset="0.5" stopColor={GOLD} />
                <Stop offset="1" stopColor={GOLD_DEEP} />
              </RadialGradient>
              <RadialGradient id="heart" cx="50%" cy="38%" r="70%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={done ? 0.3 : 0.2} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.04} />
              </RadialGradient>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={GOLD} stopOpacity={0.75} />
                <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {/* The thread */}
            <Circle cx={c} cy={c} r={ringR} fill="none" stroke={GOLD} strokeOpacity={0.4} strokeWidth={1.2} />
            {/* The heart of the ring */}
            <Circle cx={c} cy={c} r={inner} fill="url(#heart)" stroke={done ? GOLD : 'rgba(255,255,255,0.28)'} strokeWidth={done ? 2 : 1} />
            <Path d={star8(c, c, inner * 0.94, 0.8)} fill="none" stroke={GOLD} strokeOpacity={0.22} strokeWidth={1} />
            <Path d={star8(c, c, inner * 0.94, 0.8, Math.PI / 8)} fill="none" stroke={GOLD} strokeOpacity={0.12} strokeWidth={1} />
            {/* The beads */}
            {Array.from({ length: beads }, (_, i) => {
              const p = at(i);
              const on = i < lit;
              const current = i === lit - 1 && !done;
              return (
                <G key={i}>
                  {current && <Circle cx={p.x} cy={p.y} r={beadR * 2.5} fill="url(#halo)" />}
                  <Circle cx={p.x} cy={p.y} r={current ? beadR * 1.18 : beadR} fill={on ? 'url(#goldBead)' : 'url(#pearl)'} />
                </G>
              );
            })}
            {/* The leader bead and its star */}
            <Circle cx={c} cy={c - ringR} r={beadR * 2.2} fill="url(#halo)" opacity={done ? 1 : 0.45} />
            <Path d={star8(c, c - ringR, beadR * 1.55)} fill="url(#goldBead)" />
          </Svg>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: pop }] }}>
            <Text style={[styles.count, { fontSize: size * 0.27, lineHeight: size * 0.31 }]}>{t.count}</Text>
          </Animated.View>
          <Text style={[styles.under, done && { color: GOLD }]}>
            {setDone ? 'Set complete, alhamdulillah' : done ? 'Done · tap to start again' : t.target ? `of ${t.target}` : 'Tap to count'}
          </Text>
          {rounds > 0 && (
            <View style={styles.rounds}>
              {Array.from({ length: rounds }, (_, i) => (
                <View key={i} style={[styles.roundDot, (i < round - 1 || done) && { backgroundColor: GOLD }, i === round - 1 && !done && { borderColor: GOLD }]} />
              ))}
            </View>
          )}
        </Pressable>

        <View style={styles.row}>
          {!t.set &&
            TARGETS.map((n) => {
              const on = t.target === n;
              return (
                <Pressable key={n} onPress={() => save({ target: n })} style={[styles.target, jewel.glass, on && styles.on]} accessibilityRole="button" accessibilityLabel={n ? `Target ${n}` : 'No target'} accessibilityState={{ selected: on }}>
                  <Text style={[styles.chipText, on && { color: '#1D1503' }]}>{n || '∞'}</Text>
                </Pressable>
              );
            })}
          <Pressable onPress={reset} style={[styles.target, jewel.glass, { paddingHorizontal: 18 }]} accessibilityRole="button">
            <Text style={styles.chipText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <View style={[styles.stat, jewel.glass]}>
            <Text style={styles.statN}>{todayCount.toLocaleString('en-GB')}</Text>
            <Text style={styles.statL}>TODAY</Text>
          </View>
          <View style={[styles.stat, jewel.glass]}>
            <Text style={styles.statN}>{t.total.toLocaleString('en-GB')}</Text>
            <Text style={styles.statL}>ALL TIME</Text>
          </View>
        </View>
        {(todayCount > 0 || t.total > 0) && (
          <Pressable onPress={() => setSharing(true)} style={({ pressed }) => [styles.share, jewel.glass, { opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button" accessibilityLabel="Share your count and invite someone">
            <Icon name="share" size={17} color={GOLD_LIGHT} />
            <Text style={styles.shareText}>Share, and invite someone</Text>
          </Pressable>
        )}
        <Text style={styles.note}>
          {t.set ? 'After each prayer: 33 SubhanAllah, 33 Alhamdulillah, 34 Allahu Akbar (Sahih Muslim 596). ' : ''}Your counts stay on your phone unless you share them.
        </Text>
      </ScrollView>
      <TasbeehShare data={sharing ? { phrase, today: todayCount, total: t.total } : null} onClose={() => setSharing(false)} />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, jewel.glass, on && styles.on]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[styles.chipText, on && { color: '#1D1503' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EMERALD.low },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 6 },
  title: { fontFamily: fonts.read, fontSize: 32, letterSpacing: -0.5, color: '#FFFFFF' },
  sub: { fontFamily: fonts.ui, fontSize: 13.5, color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  chips: { gap: 7, paddingHorizontal: 18, paddingVertical: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13.5, color: '#FFFFFF' },
  on: { backgroundColor: GOLD, borderColor: GOLD },
  ar: { fontFamily: fonts.arabic, fontSize: 38, lineHeight: 70, textAlign: 'center', color: GOLD_LIGHT, textShadowColor: 'rgba(233,199,123,0.55)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  tl: { fontFamily: fonts.uiBold, fontSize: 16, color: '#FFFFFF' },
  en: { fontFamily: fonts.readItalic, fontSize: 15, color: 'rgba(255,255,255,0.74)', marginTop: 2 },
  setRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  setPill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 5 },
  setText: { fontFamily: fonts.uiBold, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontVariant: ['tabular-nums'] },
  counter: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ripple: { position: 'absolute', borderWidth: 2, borderColor: GOLD },
  count: { fontFamily: fonts.read, fontVariant: ['tabular-nums'], letterSpacing: -2, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 3 } },
  under: { fontFamily: fonts.uiSemi, fontSize: 14, color: 'rgba(255,255,255,0.78)' },
  rounds: { flexDirection: 'row', gap: 6, marginTop: 8 },
  roundDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap', paddingHorizontal: 18 },
  target: { borderRadius: 14, minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: 16 },
  stat: { flex: 1, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  statN: { fontFamily: fonts.read, fontSize: 26, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  statL: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.3, color: GOLD, marginTop: 2 },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, alignSelf: 'center', borderRadius: 999, paddingHorizontal: 20, minHeight: 46, marginTop: 14 },
  shareText: { fontFamily: fonts.uiSemi, fontSize: 14.5, color: '#FFFFFF' },
  note: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.62)', textAlign: 'center', marginTop: 12, paddingHorizontal: 32 },
});
