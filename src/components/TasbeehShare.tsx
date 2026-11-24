import * as Sharing from 'expo-sharing';
import type React from 'react';
import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { EMERALD, GOLD, GOLD_LIGHT, jewel, JewelGround, star8 } from './Jewel';
import { shortLink, SITE } from '@/lib/site';
import { fonts } from '@/lib/theme';

const W = 300; // on screen; saved at 1080 × 1350 like the ayah pictures

export type TasbeehShareData = {
  phrase: { ar: string; tl: string; en: string };
  today: number;
  total: number;
};

/**
 * Share your tasbeeh (Saj, 24 Nov 2026: "we should be able to share our counts").
 * A picture of the count with the phrase and an invitation to say it too. Like every share in Munib it carries no name,
 * and the caption invites ("Say it with me") so that sharing is a call to remember Allah rather than a boast.
 * Nothing is sent to Munib: the picture is made on the phone and handed to the phone's own share sheet.
 */
export function TasbeehShare({ data, onClose }: { data: TasbeehShareData | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [which, setWhich] = useState<'today' | 'total'>('today');
  const [busy, setBusy] = useState(false);
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  if (!data) return null;
  const show = which === 'today' && data.today > 0 ? 'today' : data.total > 0 && (which === 'total' || data.today === 0) ? 'total' : 'today';
  const n = show === 'today' ? data.today : data.total;
  const nText = n.toLocaleString('en-GB');
  // The number has to sit inside the ring of beads, so longer counts are set smaller.
  const nSize = nText.length <= 3 ? 58 : nText.length <= 5 ? 42 : nText.length <= 7 ? 31 : 24;
  const label = show === 'today' ? 'times today' : 'times so far';
  const message = `I've been remembering Allah with Munib: ${nText} ${label}.\nSay it with me: ${data.phrase.tl} (${data.phrase.en}).\n${SITE}`;

  const share = async () => {
    if (busy) return;
    const asText = () => Share.share({ message }).catch(() => {});
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return asText();
    setBusy(true);
    try {
      const uri = await captureRef(shot as never, { format: 'png', quality: 1, width: 1080, height: 1350 });
      if (Platform.OS === 'ios') await Share.share({ url: uri, message });
      else await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Tasbeeh' });
    } catch {
      asText();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <JewelGround look={EMERALD} />
        <View style={[styles.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.h}>Share, and invite someone</Text>
            <Text style={styles.sub}>Your name isn’t on it. It asks whoever sees it to say it too.</Text>
          </View>

          <View style={styles.shadow}>
            <View ref={shot} collapsable={false} style={styles.card}>
              <View style={styles.frame} />
              <Ring />
              <Text style={styles.eyebrow}>TASBEEH</Text>
              <Text style={styles.ar} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{data.phrase.ar}</Text>
              <Text style={styles.tl}>{data.phrase.tl}</Text>
              <Text style={styles.en}>{data.phrase.en}</Text>
              <Text style={[styles.n, { fontSize: nSize, lineHeight: 70 }]} numberOfLines={1}>{nText}</Text>
              <Text style={styles.label}>{label.toUpperCase()}</Text>
              <Text style={styles.invite}>Say it with me</Text>
              <View style={styles.brandRow}>
                <Text style={styles.brandAr}>مُنِيب</Text>
                <Text style={styles.brand} numberOfLines={1}>Munib · {shortLink(SITE)}</Text>
              </View>
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', gap: 12 }}>
            {data.today > 0 && data.total > data.today && (
              <View style={styles.chips}>
                {(['today', 'total'] as const).map((k) => (
                  <Pressable key={k} onPress={() => setWhich(k)} style={[styles.chip, jewel.glass, show === k && styles.on]} accessibilityRole="button" accessibilityState={{ selected: show === k }}>
                    <Text style={[styles.chipText, show === k && { color: '#1D1503' }]}>{k === 'today' ? 'Today' : 'All time'}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable onPress={share} style={({ pressed }) => [styles.primary, { opacity: pressed || busy ? 0.85 : 1 }]} accessibilityRole="button">
              <Text style={styles.primaryText}>{busy ? 'Getting it ready…' : 'Share'}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.ghost} accessibilityRole="button">
              <Text style={styles.ghostText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** A faint ring of beads behind the number, with the star at the top like the counter's own. */
function Ring() {
  const c = W / 2;
  const r = 82;
  return (
    <Svg width={W} height={W} style={styles.ring} pointerEvents="none">
      {Array.from({ length: 33 }, (_, i) => {
        const a = (-90 + ((i + 1) * 360) / 34) * (Math.PI / 180);
        return <Circle key={i} cx={c + Math.cos(a) * r} cy={c + Math.sin(a) * r} r={4} fill={GOLD_LIGHT} opacity={0.5} />;
      })}
      <Path d={star8(c, c - r, 9)} fill={GOLD} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EMERALD.low },
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  h: { fontFamily: fonts.read, fontSize: 26, letterSpacing: -0.5, color: '#FFFFFF', textAlign: 'center' },
  sub: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.74)', textAlign: 'center' },
  shadow: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  card: { width: W, height: W * 1.25, backgroundColor: '#0C4A38', alignItems: 'center', paddingHorizontal: 22, paddingTop: 26, overflow: 'hidden' },
  frame: { position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, borderWidth: 1.2, borderColor: 'rgba(233,199,123,0.7)' },
  ring: { position: 'absolute', top: 70 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 2.4, color: GOLD },
  ar: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 54, color: GOLD_LIGHT, textAlign: 'center', marginTop: 2 },
  tl: { fontFamily: fonts.uiBold, fontSize: 13.5, color: '#FFFFFF' },
  en: { fontFamily: fonts.readItalic, fontSize: 12, color: 'rgba(255,255,255,0.76)', marginTop: 1 },
  n: { fontFamily: fonts.read, fontSize: 58, letterSpacing: -2, color: '#FFFFFF', marginTop: 40, fontVariant: ['tabular-nums'], maxWidth: 140 },
  label: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.6, color: GOLD, marginTop: -2 },
  invite: { position: 'absolute', bottom: 50, fontFamily: fonts.read, fontSize: 17, color: '#FFFFFF' },
  brandRow: { position: 'absolute', left: 0, right: 0, bottom: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  brand: { fontFamily: fonts.uiSemi, fontSize: 9.5, color: 'rgba(255,255,255,0.74)' },
  brandAr: { fontFamily: fonts.arabic, fontSize: 13, lineHeight: 20, color: GOLD },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13.5, color: '#FFFFFF' },
  on: { backgroundColor: GOLD, borderColor: GOLD },
  primary: { backgroundColor: GOLD, borderRadius: 28, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.uiBold, fontSize: 16, color: '#1D1503' },
  ghost: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontFamily: fonts.uiSemi, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
});
