import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'qrcode';
import { GoldStar } from './Gold';
import { fonts } from '@/lib/theme';
import { loadChapter, SURAHS, type ChapterAyah } from '@/lib/quran';
import { skyPhase, type SkyPhase } from '@/lib/sky';

/**
 * The web app on a computer (Saj, 15 Nov 2026: "so it doesn't just look like a brick in the screen"): the mosque
 * scene fills the window and follows the time of day (dawn, day, sunset, night, from the visitor's clock), the app sits
 * in a phone-shaped frame with a soft gold glow, and on wide screens the left side introduces Munib, or, when someone
 * opened a shared ayah link, shows that ayah large. A QR code takes it to the visitor's phone. Phones and narrow
 * windows get the app full screen, as before.
 */
const GOLD = '#E2B76A';
const SCENES: Record<SkyPhase, number> = {
  fajr: require('../../assets/art/sky/fajr.jpg'),
  day: require('../../assets/art/sky/day.jpg'),
  maghrib: require('../../assets/art/sky/maghrib.jpg'),
  isha: require('../../assets/art/sky/welcome.jpg'),
};
/** How dark the veil over each scene is, so white text always reads. */
const VEIL: Record<SkyPhase, string> = {
  fajr: 'rgba(22,14,36,0.55)',
  day: 'rgba(8,24,44,0.5)',
  maghrib: 'rgba(30,12,10,0.5)',
  isha: 'rgba(5,8,22,0.55)',
};
const GROUND: Record<SkyPhase, string> = { fajr: '#1B1426', day: '#0D2238', maghrib: '#24130E', isha: '#070B1C' };
const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 61.3) % 100, r: 1 + (i % 3) * 0.6, o: 0.25 + ((i * 7) % 10) / 20 }));

/** Until Munib is on the App Store, the code opens the web app (or the shared ayah) on the visitor's phone. */
const APP_URL = 'https://app.munib.co';

function usePhase(): SkyPhase {
  const work = () => {
    const forced = typeof window !== 'undefined' ? /[?&]sky=(fajr|day|maghrib|isha)/.exec(window.location?.search ?? '')?.[1] : null;
    return (forced as SkyPhase) || skyPhase(new Date());
  };
  const [p, setP] = useState<SkyPhase>(work);
  useEffect(() => {
    const t = setInterval(() => setP(work()), 60000);
    return () => clearInterval(t);
  }, []);
  return p;
}

type Shared = { s: number; from: number; to: number };
/** The ayah in the address the visitor arrived on (app.munib.co/2/255 or /93/1-4), read once before the app moves on. */
function sharedFromUrl(): Shared | null {
  if (typeof window === 'undefined') return null;
  const m = /^\/(\d{1,3})\/(\d{1,3})(?:-(\d{1,3}))?\/?$/.exec(window.location?.pathname ?? '');
  if (!m) return null;
  const s = +m[1], from = +m[2], to = Math.max(from, +(m[3] ?? m[2]));
  if (s < 1 || s > 114 || from < 1 || to > SURAHS[s - 1][3] || to - from > 9) return null;
  return { s, from, to };
}

function QR({ value, size }: { value: string; size: number }) {
  const d = useMemo(() => {
    try {
      const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
      let path = '';
      for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
      return { path, n: modules.size };
    } catch {
      return null;
    }
  }, [value]);
  if (!d) return null;
  return (
    <View style={[styles.qrBox, { width: size + 20, height: size + 20 }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${d.n} ${d.n}`}>
        <Path d={d.path} fill="#0B1220" />
      </Svg>
    </View>
  );
}

function Rule() {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleLine} />
      <GoldStar size={11} color={GOLD} />
      <View style={styles.ruleLine} />
    </View>
  );
}

const arabicNum = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

function SharedAyah({ shared, maxH }: { shared: Shared; maxH: number }) {
  const [list, setList] = useState<ChapterAyah[] | null>(null);
  useEffect(() => {
    loadChapter(shared.s, 'en').then(setList, () => setList([]));
  }, [shared.s]);
  const ayat = list?.filter((x) => x.n >= shared.from && x.n <= shared.to) ?? [];
  const many = ayat.length > 1;
  const ar = ayat.map((x) => x.ar).join(' ');
  const trLen = ayat.reduce((n, x) => n + x.tr.length, 0);
  const size = ar.length > 380 ? 22 : ar.length > 240 ? 26 : 32;
  const trSize = trLen > 600 ? 15 : trLen > 350 ? 17 : 19;
  const [name, , meaning] = SURAHS[shared.s - 1];
  const ref = `${shared.s}:${shared.from}${shared.to > shared.from ? `–${shared.to}` : ''}`;
  return (
    <ScrollView style={{ maxHeight: maxH }} contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>SHARED WITH YOU</Text>
      <Text style={styles.ayahRef}>
        {name} · {meaning} · {ref}
      </Text>
      <Rule />
      {list === null ? (
        <Text style={styles.pointText}>Loading the ayah…</Text>
      ) : ayat.length ? (
        <>
          <Text style={[styles.ayahAr, { fontSize: size, lineHeight: size * 1.9 }]}>
            {ayat.map((x) => (
              <Text key={x.n}>
                {x.ar}
                {many && <Text style={{ color: GOLD }}>{'\u00A0'}{arabicNum(x.n)}</Text>}{' '}
              </Text>
            ))}
          </Text>
          <Text style={[styles.ayahTr, { fontSize: trSize, lineHeight: trSize * 1.55 }]}>
            {ayat.map((x, i) => (
              <Text key={x.n}>
                {many && <Text style={styles.num}>{x.n} </Text>}
                {x.tr}
                {i < ayat.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Text>
          <Text style={styles.by}>Saheeh International</Text>
        </>
      ) : (
        <Text style={styles.pointText}>It's open in Munib on the right.</Text>
      )}
      {trLen < 600 && <Text style={styles.quiet}>Keep reading from here in Munib, on the right. Munib: return to Allah, a little more every day.</Text>}
    </ScrollView>
  );
}

export function WebFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const phase = usePhase();
  const [shared] = useState(sharedFromUrl);
  if (Platform.OS !== 'web') return <>{children}</>;
  // A phone, or a narrow window: the app fills it.
  if (width < 700 || height < 560) return <View style={{ flex: 1 }}>{children}</View>;
  const side = width >= 1100;
  const h = Math.min(height - 48, 900);
  const w = Math.min(430, Math.round(h * 0.47));
  const qrUrl = shared ? `https://munib.co/${shared.s}/${shared.from}${shared.to > shared.from ? `-${shared.to}` : ''}` : APP_URL;
  const night = phase === 'isha' || phase === 'fajr';
  const tallEnough = height >= 760;
  return (
    <View style={[styles.root, { backgroundColor: GROUND[phase] }]}>
      <Image source={SCENES[phase]} style={styles.scene} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={[styles.veil, { backgroundColor: VEIL[phase] }]} />
      {night &&
        STARS.slice(0, phase === 'fajr' ? 14 : 40).map((s, i) => (
          <View key={i} pointerEvents="none" style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y * 0.6}%`, width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: '#FFF6E0', opacity: s.o }} />
        ))}
      <View style={[styles.row, { gap: side ? 96 : 0 }]}>
        {side && (
          <View style={styles.intro}>
            {shared ? (
              <SharedAyah shared={shared} maxH={h - (tallEnough ? 190 : 40)} />
            ) : (
              <>
                <Text style={styles.ar}>مُنِيب</Text>
                <Text style={styles.name}>Munib</Text>
                <Rule />
                <Text style={styles.big}>
                  Return to <Text style={{ color: GOLD }}>Allah</Text>,{'\n'}a little more every day.
                </Text>
                <Text style={styles.eyebrow}>FOR NEW MUSLIMS AND LIFELONG ONES</Text>
                <View style={{ gap: 12, marginTop: 8 }}>
                  {['The Quran, one ayah at a time', 'Learn to pray, step by step', 'Read together with your family', 'Ask anything about Islam'].map((t) => (
                    <View key={t} style={styles.point}>
                      <GoldStar size={10} color={GOLD} />
                      <Text style={styles.pointText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {(tallEnough || !shared) && (
              <View style={styles.qrRow}>
                <QR value={qrUrl} size={84} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.qrTitle}>{shared ? 'Read it on your phone' : 'Try Munib on your phone'}</Text>
                  <Text style={styles.qrText}>Point your phone's camera at the code.</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Coming soon to iPhone</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
        <View style={[styles.phone, { width: w, height: h }]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.7 },
  veil: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  intro: { width: 440, gap: 14 },
  ar: { fontFamily: fonts.arabic, fontSize: 64, lineHeight: 110, color: GOLD, textShadowColor: 'rgba(226,183,106,0.45)', textShadowRadius: 24 },
  name: { fontFamily: fonts.read, fontSize: 44, letterSpacing: -1, color: '#FFFFFF', marginTop: -18 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 110 },
  ruleLine: { flex: 1, height: 1, backgroundColor: 'rgba(226,183,106,0.6)' },
  big: { fontFamily: fonts.read, fontSize: 30, lineHeight: 40, letterSpacing: -0.6, color: '#F4F1EA', marginTop: 6 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 2, color: GOLD },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointText: { fontFamily: fonts.ui, fontSize: 16, color: 'rgba(244,241,234,0.9)', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 },
  ayahRef: { fontFamily: fonts.read, fontSize: 22, color: '#FFFFFF', marginTop: -4 },
  ayahAr: { fontFamily: fonts.arabic, color: '#FFF8EA', textAlign: 'right', writingDirection: 'rtl', textShadowColor: 'rgba(226,183,106,0.35)', textShadowRadius: 18 },
  ayahTr: { fontFamily: fonts.read, fontSize: 19, lineHeight: 30, color: '#F4F1EA', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8 },
  num: { fontFamily: fonts.uiBold, fontSize: 12, color: GOLD },
  by: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(244,241,234,0.6)' },
  quiet: { fontFamily: fonts.readItalic, fontSize: 14, lineHeight: 21, color: 'rgba(244,241,234,0.7)', marginTop: 4 },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(226,183,106,0.35)', backgroundColor: 'rgba(8,10,24,0.45)' },
  qrBox: { backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qrTitle: { fontFamily: fonts.uiSemi, fontSize: 16, color: '#FFFFFF' },
  qrText: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(244,241,234,0.75)' },
  badge: { alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: 'rgba(226,183,106,0.7)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(226,183,106,0.1)' },
  badgeText: { fontFamily: fonts.uiSemi, fontSize: 12, color: GOLD },
  phone: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226,183,106,0.45)',
    backgroundColor: '#000',
    shadowColor: '#E2B76A',
    shadowOpacity: 0.35,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
});
