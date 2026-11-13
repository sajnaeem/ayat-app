import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Icon } from '@/components/Icon';
import { fonts, mix, usePalette } from '@/lib/theme';

/**
 * Qibla: the direction of the Kaaba from where you are, on a compass that turns with the phone.
 * Location is read on the phone only and never sent anywhere.
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
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
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
        if (Platform.OS === 'web') return;
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

  const size = Math.min(width - 48, 340);
  const r = size / 2;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const ring = facing ? pal.accent : pal.line;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: pal.text }]}>Qibla</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>

      {state === 'asking' ? (
        <View style={styles.center}>
          <ActivityIndicator color={pal.muted} />
          <Text style={[styles.small, { color: pal.muted, marginTop: 12 }]}>Finding where you are…</Text>
        </View>
      ) : state === 'denied' || state === 'error' ? (
        <View style={[styles.center, { paddingHorizontal: 28, gap: 12 }]}>
          <Text style={[styles.h2, { color: pal.text, textAlign: 'center' }]}>{state === 'denied' ? 'Munib needs your location to find the Qibla' : 'Couldn’t find your location'}</Text>
          <Text style={[styles.body, { color: pal.muted, textAlign: 'center' }]}>
            {state === 'denied' ? 'It’s used on your phone only, to work out the direction of the Kaaba, and never sent anywhere.' : 'Check that Location Services are on, then try again.'}
          </Text>
          <Pressable onPress={() => Linking.openSettings()} style={[styles.btn, { backgroundColor: pal.text }]}>
            <Text style={[styles.btnText, { color: pal.bg }]}>Open Settings</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.status, { color: facing ? pal.accent : pal.text }]} accessibilityLiveRegion="polite">
            {heading == null
              ? `The Qibla is ${Math.round(bearing!)}° from north`
              : facing
                ? 'You’re facing the Qibla'
                : `Turn ${diff! > 0 ? 'right' : 'left'} ${Math.abs(Math.round(diff!))}°`}
          </Text>

          <View style={{ width: size, height: size + 24, alignItems: 'center', marginTop: 18 }}>
            {/* The fixed pointer: the way the top of your phone is facing */}
            <Svg width={24} height={18} style={{ marginBottom: 6 }}>
              <Path d="M12 18 L2 2 L22 2 Z" fill={facing ? pal.accent : pal.text} />
            </Svg>
            <Svg width={size} height={size} style={{ transform: [{ rotate: `${-dial}deg` }] }}>
              <Circle cx={r} cy={r} r={r - 2} fill={facing ? mix(pal.bg, pal.accent, 0.1) : pal.surface} stroke={ring} strokeWidth={facing ? 3 : 1.5} />
              {ticks.map((t) => {
                const long = t % 90 === 0;
                const mid = t % 30 === 0;
                const len = long ? 16 : mid ? 10 : 5;
                return (
                  <Line key={t} x1={r} y1={8} x2={r} y2={8 + len} stroke={long ? pal.text : pal.muted} strokeWidth={long ? 2.5 : 1} transform={`rotate(${t} ${r} ${r})`} />
                );
              })}
              {(['N', 'E', 'S', 'W'] as const).map((l, i) => (
                <SvgText key={l} x={r} y={44} fontSize={18} fontWeight="700" fill={l === 'N' ? '#B4432F' : pal.text} textAnchor="middle" transform={`rotate(${i * 90} ${r} ${r})`}>
                  {l}
                </SvgText>
              ))}
              {bearing != null && (
                <G transform={`rotate(${bearing} ${r} ${r})`}>
                  <Line x1={r} y1={r} x2={r} y2={78} stroke={pal.accent} strokeWidth={4} strokeLinecap="round" />
                  {/* The Kaaba */}
                  <Rect x={r - 15} y={46} width={30} height={30} rx={3} fill="#1B1B1B" />
                  <Rect x={r - 15} y={53} width={30} height={4} fill="#C9A24A" />
                </G>
              )}
              <Circle cx={r} cy={r} r={7} fill={pal.text} />
            </Svg>
          </View>

          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            <Text style={[styles.body, { color: pal.text }]}>
              The Qibla is <Text style={{ fontFamily: fonts.uiBold }}>{Math.round(bearing!)}°</Text> from north ({compassName(bearing!)}). Makkah is {Math.round(distanceKm(here!.lat, here!.lon)).toLocaleString('en-GB')} km away.
            </Text>
            {heading == null ? (
              <Text style={[styles.small, { color: pal.muted }]}>This phone isn’t giving a compass reading. Use the angle from north with a compass.</Text>
            ) : accuracy < 2 ? (
              <Text style={[styles.small, { color: '#B4432F' }]}>The compass needs calibrating: move your phone in a figure of eight a few times, away from metal and magnets.</Text>
            ) : (
              <Text style={[styles.small, { color: pal.muted }]}>Hold your phone flat, away from metal, magnets and speakers. Turn until the Kaaba is under the arrow.</Text>
            )}
          </View>
          <Text style={[styles.small, { color: pal.muted, textAlign: 'center', marginTop: 10, paddingHorizontal: 28 }]}>Your location stays on your phone. If you’re unsure, check with your local mosque.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  status: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.3, marginTop: 8, textAlign: 'center' },
  h2: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8, alignSelf: 'stretch', marginTop: 10 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, alignSelf: 'stretch' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
});
