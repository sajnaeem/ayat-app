import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { ExplainIntro } from '@/components/Explain';
import { Icon } from '@/components/Icon';
import { GOLD, GOLD_DEEP, GOLD_LIGHT, jewel, JewelGround, jewelPalette, TWILIGHT } from '@/components/Jewel';
import { ART } from '@/lib/art';
import { fonts, usePalette } from '@/lib/theme';

/**
 * Qibla: the direction of the Kaaba from where you are, on a compass that turns with the phone.
 * Location is read on the phone only and never sent anywhere.
 * Look (Saj, 15 Nov 2026: "visually striking"): the twilight sky, a gold compass with a star rose, a beam of light
 * from the centre to Munib's 3D Kaaba, and the whole dial glowing when the phone faces the Qibla.
 */

const KAABA = { lat: 21.422487, lon: 39.826206 };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const norm = (d: number) => ((d % 360) + 360) % 360;

/** Great-circle bearing from a point to the Kaaba, in degrees from true north. */
export function qiblaBearing(lat: number, lon: number) {
  const φ1 = rad(lat);
  const φ2 = rad(KAABA.lat);
  const Δλ = rad(KAABA.lon - lon);
  return norm(deg(Math.atan2(Math.sin(Δλ) * Math.cos(φ2), Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ))));
}
function distanceKm(lat: number, lon: number) {
  const dφ = rad(KAABA.lat - lat);
  const dλ = rad(KAABA.lon - lon);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const compassName = (d: number) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(norm(d) / 45) % 8];

export default function Qibla() {
  const pal = jewelPalette(usePalette());
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [state, setState] = useState<'asking' | 'denied' | 'ready' | 'error'>('asking');
  const [here, setHere] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState(3);
  // Unwrapped angle, so the dial turns the short way round instead of spinning at 359° → 0°.
  const [dial, setDial] = useState(0);
  const last = useRef<number | null>(null);
  const facingBefore = useRef(false);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let live = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return live && setState('denied');
        const pos = (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!live) return;
        setHere({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setState('ready');
        if (Platform.OS === 'web') {
          // For screenshots on the web: ?h=119 pretends the phone is pointing that way.
          const h = Number(new URLSearchParams(window.location.search).get('h'));
          if (window.location.search.includes('h=') && isFinite(h)) {
            setHeading(h);
            setDial(h);
          }
          return;
        }
        sub = await Location.watchHeadingAsync((h) => {
          const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setAccuracy(h.accuracy);
          setHeading(v);
          const prev = last.current;
          const step = prev == null ? v : ((v - norm(prev) + 540) % 360) - 180;
          last.current = prev == null ? v : prev + step;
          setDial(last.current);
        });
      } catch {
        if (live) setState('error');
      }
    })();
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);

  const bearing = here ? qiblaBearing(here.lat, here.lon) : null;
  const diff = bearing != null && heading != null ? ((bearing - heading + 540) % 360) - 180 : null; // + means turn right
  const facing = diff != null && Math.abs(diff) <= 4;

  useEffect(() => {
    if (facing && !facingBefore.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    facingBefore.current = facing;
  }, [facing]);

  const size = Math.min(width - 40, height * 0.44, 350);
  const r = size / 2;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!facing) return glow.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [facing, glow]);

  // The compass rose: eight points, each split into a light and a dark facet.
  const rose: { d: string; light: boolean }[] = [];
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0;
    const tip = (long ? 0.34 : 0.22) * r;
    const a = (i * 45 - 90) * (Math.PI / 180);
    const w = 0.075 * r;
    const tx = r + Math.cos(a) * tip, ty = r + Math.sin(a) * tip;
    for (const side of [-1, 1]) {
      const b = a + (side * Math.PI) / 4;
      rose.push({ d: `M ${r} ${r} L ${tx} ${ty} L ${r + Math.cos(b) * w} ${r + Math.sin(b) * w} Z`, light: side === 1 });
    }
  }
  const kaabaSize = Math.round(size * 0.2);
  const kaabaAt = bearing != null ? { x: r + Math.sin(rad(bearing)) * r * 0.56, y: r - Math.cos(rad(bearing)) * r * 0.56 } : null;
  const km = here ? Math.round(distanceKm(here.lat, here.lon)) : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <JewelGround look={TWILIGHT} />
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>Qibla</Text>
          <Text style={styles.sub}>The direction of the Kaaba in Makkah</Text>
        </View>
        <Pressable onPress={() => router.back()} style={[jewel.glass, jewel.round]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
      <ExplainIntro id="qibla" pal={pal} compact style={{ paddingHorizontal: 2 }} />

      {state === 'asking' ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={[styles.small, { marginTop: 12 }]}>Finding where you are…</Text>
        </View>
      ) : state === 'denied' || state === 'error' ? (
        <View style={[styles.center, { paddingHorizontal: 10, gap: 12 }]}>
          <Image source={ART.kaaba} style={{ width: 150, height: 150 }} resizeMode="contain" />
          <Text style={[styles.h2, { textAlign: 'center' }]}>{state === 'denied' ? 'Munib needs your location to find the Qibla' : 'Couldn’t find your location'}</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            {state === 'denied' ? 'It’s used on your phone only, to work out the direction of the Kaaba, and never sent anywhere.' : 'Check that Location Services are on, then try again.'}
          </Text>
          <Pressable onPress={() => Linking.openSettings()} style={styles.btn}>
            <Text style={styles.btnText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.status, facing && { color: GOLD_LIGHT, textShadowColor: 'rgba(233,199,123,0.7)', textShadowRadius: 18 }]} accessibilityLiveRegion="polite">
            {heading == null
              ? `${Math.round(bearing!)}° from north`
              : facing
                ? 'You’re facing the Qibla'
                : `Turn ${diff! > 0 ? 'right' : 'left'} ${Math.abs(Math.round(diff!))}°`}
          </Text>
          <Text style={styles.statusSub}>{heading == null ? `The Qibla is to the ${compassName(bearing!)}` : facing ? 'Allahu Akbar' : 'Turn until the Kaaba is under the gold marker'}</Text>

          <View style={{ width: size, height: size + 26, alignItems: 'center', marginTop: 10 }}>
            {/* The fixed marker: the way the top of your phone is facing */}
            <Svg width={30} height={22} style={{ marginBottom: 4 }}>
              <Path d="M15 22 L3 3 Q15 -2 27 3 Z" fill={facing ? GOLD_LIGHT : GOLD} />
            </Svg>
            {/* The light when you face the Qibla */}
            <Animated.View pointerEvents="none" style={[styles.halo, { width: size + 36, height: size + 36, borderRadius: (size + 36) / 2, top: 26 - 18, opacity: glow }]} />
            <View style={{ width: size, height: size, transform: [{ rotate: `${-dial}deg` }] }}>
              <Svg width={size} height={size}>
                <Defs>
                  <RadialGradient id="face" cx="50%" cy="42%" r="60%">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.05} />
                  </RadialGradient>
                  <LinearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={GOLD_LIGHT} />
                    <Stop offset="0.5" stopColor={GOLD_DEEP} />
                    <Stop offset="1" stopColor={GOLD} />
                  </LinearGradient>
                  <LinearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0" stopColor={GOLD} stopOpacity={0} />
                    <Stop offset="1" stopColor={GOLD_LIGHT} stopOpacity={facing ? 0.95 : 0.6} />
                  </LinearGradient>
                </Defs>
                <Circle cx={r} cy={r} r={r - 4} fill="url(#face)" stroke="url(#bezel)" strokeWidth={facing ? 5 : 3.5} />
                <Circle cx={r} cy={r} r={r - 12} fill="none" stroke={GOLD} strokeOpacity={0.35} strokeWidth={1} />
                <Circle cx={r} cy={r} r={r * 0.4} fill="none" stroke={GOLD} strokeOpacity={0.3} strokeWidth={1} />
                {ticks.map((t) => {
                  const long = t % 90 === 0;
                  const mid = t % 30 === 0;
                  const len = long ? 13 : mid ? 9 : 5;
                  return <Line key={t} x1={r} y1={16} x2={r} y2={16 + len} stroke={long || mid ? GOLD : '#FFFFFF'} strokeOpacity={long ? 1 : mid ? 0.8 : 0.4} strokeWidth={long ? 2.4 : 1.1} transform={`rotate(${t} ${r} ${r})`} />;
                })}
                {(['N', 'E', 'S', 'W'] as const).map((l, i) => (
                  <SvgText key={l} x={r} y={50} fontSize={17} fontWeight="700" fill={l === 'N' ? GOLD_LIGHT : '#FFFFFF'} fillOpacity={l === 'N' ? 1 : 0.85} textAnchor="middle" transform={`rotate(${i * 90} ${r} ${r})`}>
                    {l}
                  </SvgText>
                ))}
                {/* The beam of light toward the Kaaba */}
                {bearing != null && (
                  <G transform={`rotate(${bearing} ${r} ${r})`}>
                    <Path d={`M ${r} ${r} L ${r - r * 0.16} ${14} L ${r + r * 0.16} ${14} Z`} fill="url(#beam)" opacity={0.5} />
                    <Line x1={r} y1={r} x2={r} y2={14} stroke={GOLD_LIGHT} strokeWidth={facing ? 3 : 2} strokeLinecap="round" strokeOpacity={0.9} />
                  </G>
                )}
                {rose.map((f, i) => (
                  <Path key={i} d={f.d} fill={f.light ? GOLD_LIGHT : GOLD_DEEP} />
                ))}
                <Circle cx={r} cy={r} r={4} fill="#FFFFFF" />
              </Svg>
              {kaabaAt && (
                <Image
                  source={ART.kaaba}
                  style={{ position: 'absolute', width: kaabaSize, height: kaabaSize, left: kaabaAt.x - kaabaSize / 2, top: kaabaAt.y - kaabaSize / 2, transform: [{ rotate: `${dial}deg` }] }}
                  resizeMode="contain"
                  accessibilityLabel="The Kaaba"
                />
              )}
            </View>
          </View>

          <View style={styles.stats}>
            <View style={[styles.stat, jewel.glass]}>
              <Text style={styles.statN}>{Math.round(bearing!)}°</Text>
              <Text style={styles.statL} numberOfLines={1}>{compassName(bearing!).toUpperCase()}</Text>
            </View>
            <View style={[styles.stat, jewel.glass]}>
              <Text style={styles.statN}>{km.toLocaleString('en-GB')} km</Text>
              <Text style={styles.statL}>TO MAKKAH</Text>
            </View>
          </View>
          {heading == null ? (
            <Text style={styles.hint}>This device isn’t giving a compass reading. Use the angle from north with a compass.</Text>
          ) : accuracy < 2 ? (
            <Text style={[styles.hint, { color: '#FFD3C4' }]}>The compass needs calibrating: move your phone in a figure of eight a few times, away from metal and magnets.</Text>
          ) : (
            <Text style={styles.hint}>Hold your phone flat, away from metal, magnets and speakers.</Text>
          )}
          <Text style={[styles.small, { textAlign: 'center', marginTop: 6 }]}>Your location stays on your phone. If you’re unsure, check with your local mosque.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18, backgroundColor: TWILIGHT.low },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontFamily: fonts.read, fontSize: 32, letterSpacing: -0.5, color: '#FFFFFF' },
  sub: { fontFamily: fonts.ui, fontSize: 13.5, color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  status: { fontFamily: fonts.read, fontSize: 30, letterSpacing: -0.5, marginTop: 10, textAlign: 'center', color: '#FFFFFF', textShadowOffset: { width: 0, height: 0 } },
  statusSub: { fontFamily: fonts.ui, fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 2, textAlign: 'center' },
  halo: { position: 'absolute', borderWidth: 10, borderColor: 'rgba(233,199,123,0.55)', shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
  h2: { fontFamily: fonts.read, fontSize: 24, letterSpacing: -0.3, color: '#FFFFFF' },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.8)' },
  small: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.62)' },
  hint: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 12, paddingHorizontal: 12 },
  stats: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 14 },
  stat: { flex: 1, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  statN: { fontFamily: fonts.read, fontSize: 26, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  statL: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.2, color: GOLD, marginTop: 2 },
  btn: { borderRadius: 999, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, alignSelf: 'stretch', backgroundColor: GOLD },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16, color: '#1D1503' },
});
