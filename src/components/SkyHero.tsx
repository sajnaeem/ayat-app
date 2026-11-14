import type { ReactNode } from 'react';
import { Image, ImageBackground, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { fonts } from '@/lib/theme';

/**
 * The premium look (Saj, 14 Nov 2026): a full-bleed scene of a marble mosque under the sky as it is now
 * (dawn, day, sunset or night; Munib's own three.js renders in assets/art/sky, source scripts/art/sky.html),
 * a serif title, and frosted-glass panels. The rest of the screen slides up over it as a rounded sheet.
 */
export type SkyPhase = 'fajr' | 'day' | 'maghrib' | 'isha';
const SKY = {
  fajr: require('../../assets/art/sky/fajr.jpg'),
  day: require('../../assets/art/sky/day.jpg'),
  maghrib: require('../../assets/art/sky/maghrib.jpg'),
  isha: require('../../assets/art/sky/isha.jpg'),
};

/** Which sky to show: from today's prayer times when we have them, otherwise from the clock. */
export function skyPhase(now: Date, t?: { fajr: Date; sunrise: Date; maghrib: Date; isha: Date } | null): SkyPhase {
  if (t) {
    const n = now.getTime();
    if (n < t.fajr.getTime() || n >= t.isha.getTime()) return 'isha';
    if (n < t.sunrise.getTime() + 45 * 60000) return 'fajr';
    if (n >= t.maghrib.getTime() - 50 * 60000) return 'maghrib';
    return 'day';
  }
  const h = now.getHours() + now.getMinutes() / 60;
  return h < 4.5 || h >= 20 ? 'isha' : h < 7.5 ? 'fajr' : h >= 16.5 ? 'maghrib' : 'day';
}

/** Today's Islamic date (Umm al-Qura), e.g. "23 Jumada I 1448", if the phone can work it out. */
export function hijriToday(d = new Date()): string | null {
  try {
    const s = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    return s.replace(/\s*AH$/, '').replace(/ʻ/g, 'ʿ');
  } catch {
    return null;
  }
}

export function SkyHero({ phase, top, height = 470, children }: { phase: SkyPhase; top: number; height?: number; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const w = Platform.OS === 'web' ? Math.min(width, 520) : width;
  if (height < 400)
    // A short hero shows the bottom of the scene (the mosque), not the empty sky.
    return (
      <View style={{ height: height + top, overflow: 'hidden' }}>
        <Image source={SKY[phase]} style={[styles.imgLow, { width: w, height: w * 1.25, bottom: -w * 1.25 * 0.1 }]} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[styles.shade, { paddingTop: top + 12 }]}>{children}</View>
      </View>
    );
  return (
    <ImageBackground source={SKY[phase]} style={{ height: height + top }} imageStyle={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors>
      <View style={[styles.shade, { paddingTop: top + 12 }]}>{children}</View>
    </ImageBackground>
  );
}

/** A frosted panel to sit on the sky. */
export function Glass({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

export const sky = StyleSheet.create({
  title: { fontFamily: fonts.read, fontSize: 36, letterSpacing: -0.6, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 12 },
  eyebrow: { fontFamily: fonts.uiSemi, fontSize: 13.5, color: 'rgba(255,255,255,0.86)' },
  big: { fontFamily: fonts.read, fontSize: 54, lineHeight: 62, letterSpacing: -1.2, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 16 },
  line: { fontFamily: fonts.ui, fontSize: 16, color: 'rgba(255,255,255,0.9)' },
});

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
  imgLow: { position: 'absolute', left: 0 },
  shade: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  glass: { backgroundColor: 'rgba(16,20,36,0.26)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: StyleSheet.hairlineWidth, borderRadius: 22 },
});
