import React from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GoldStar } from './Gold';
import { fonts } from '@/lib/theme';

/**
 * The web app on a computer (Saj, 15 Nov 2026: "so it doesn't just look like a brick in the screen"): the night
 * scene from the welcome screen fills the window, the app sits in a phone-shaped frame with a soft gold glow, and on
 * wide screens Munib introduces itself on the left. Phones and narrow windows get the app full screen, as before.
 */
const GOLD = '#E2B76A';
const SCENE = require('../../assets/art/sky/welcome.jpg');
const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 61.3) % 100, r: 1 + (i % 3) * 0.6, o: 0.25 + ((i * 7) % 10) / 20 }));

export function WebFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;
  // A phone, or a narrow window: the app fills it.
  if (width < 700 || height < 560) return <View style={{ flex: 1 }}>{children}</View>;
  const side = width >= 1100;
  const h = Math.min(height - 48, 900);
  const w = Math.min(430, Math.round(h * 0.47));
  return (
    <View style={styles.root}>
      <Image source={SCENE} style={styles.scene} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.shade} />
      {STARS.map((s, i) => (
        <View key={i} pointerEvents="none" style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y * 0.6}%`, width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: '#FFF6E0', opacity: s.o }} />
      ))}
      <View style={[styles.row, { gap: side ? 96 : 0 }]}>
        {side && (
          <View style={styles.intro}>
            <Text style={styles.ar}>مُنِيب</Text>
            <Text style={styles.name}>Munib</Text>
            <View style={styles.rule}>
              <View style={styles.ruleLine} />
              <GoldStar size={11} color={GOLD} />
              <View style={styles.ruleLine} />
            </View>
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming soon to iPhone</Text>
            </View>
            <Text style={styles.quote}>“And came with a heart turning back to Him.” Quran 50:33</Text>
          </View>
        )}
        <View style={[styles.phone, { width: w, height: h }]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B1C', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.55 },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(5,8,22,0.55)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  intro: { width: 420, gap: 14 },
  ar: { fontFamily: fonts.arabic, fontSize: 64, lineHeight: 110, color: GOLD, textShadowColor: 'rgba(226,183,106,0.45)', textShadowRadius: 24 },
  name: { fontFamily: fonts.read, fontSize: 44, letterSpacing: -1, color: '#FFFFFF', marginTop: -18 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 110 },
  ruleLine: { flex: 1, height: 1, backgroundColor: 'rgba(226,183,106,0.6)' },
  big: { fontFamily: fonts.read, fontSize: 30, lineHeight: 40, letterSpacing: -0.6, color: '#F4F1EA', marginTop: 6 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 2, color: GOLD },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointText: { fontFamily: fonts.ui, fontSize: 16, color: 'rgba(244,241,234,0.9)' },
  badge: { alignSelf: 'flex-start', marginTop: 14, borderWidth: 1, borderColor: 'rgba(226,183,106,0.7)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: 'rgba(226,183,106,0.1)' },
  badgeText: { fontFamily: fonts.uiSemi, fontSize: 14, color: GOLD },
  quote: { fontFamily: fonts.readItalic, fontSize: 14, color: 'rgba(244,241,234,0.6)', marginTop: 10 },
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
