import type React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ART, ArtName } from '@/lib/art';
import { Icon, IconName } from './Icon';
import { fonts, mix, Palette, popFor } from '@/lib/theme';

/** Grouped settings-style lists, shared by the You, Quran, Prayer and Together tabs. */
export const DANGER = '#B4432F';

export function Section({ pal, title, note }: { pal: Palette; title: string; note?: string }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: pal.text }]}>{title}</Text>
      {!!note && <Text style={[styles.sub, { color: pal.muted }]}>{note}</Text>}
    </View>
  );
}

export function Group({ pal, children }: { pal: Palette; children: React.ReactNode }) {
  return <View style={[styles.card, { backgroundColor: pal.surface }, pal.bold && { borderRadius: 22 }]}>{children}</View>;
}

export function Row({
  pal, icon, title, sub, value, valueColor, onPress, divider, highlight, danger, onInfo,
}: { pal: Palette; icon: IconName; title: string; sub?: string; value?: string; valueColor?: string; onPress: () => void; divider?: boolean; highlight?: boolean; danger?: boolean; onInfo?: () => void }) {
  const tint = danger ? DANGER : pal.accent;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
    >
      <View style={[styles.icon, { backgroundColor: pal.bold && !danger ? popFor(pal, icon) : highlight ? tint : mix(pal.surface, tint, pal.dark ? 0.22 : 0.12) }]}>
        <Icon name={icon} size={18} color={pal.bold && !danger ? '#FFFFFF' : highlight ? pal.onAccent : tint} strokeWidth={pal.bold ? 2 : undefined} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: danger ? DANGER : pal.text }]}>{title}</Text>
        {!!sub && <Text style={[styles.sub, { color: pal.muted }]}>{sub}</Text>}
      </View>
      {!!value && <Text style={[styles.value, { color: valueColor ?? pal.muted }]}>{value}</Text>}
      {!!onInfo && (
        <Pressable onPress={onInfo} hitSlop={10} accessibilityRole="button" accessibilityLabel={`What is ${title}?`} style={[styles.info, { borderColor: mix(pal.surface, pal.accent, 0.45) }]}>
          <Text style={[styles.infoText, { color: pal.accent }]}>?</Text>
        </Pressable>
      )}
      {!danger && <Icon name="chevron" size={16} color={pal.muted} />}
    </Pressable>
  );
}

/** A bright square card with a 3D graphic, for a tab's main features (two per row inside TileGrid). */
export function Tile({ pal, colour, title, sub, art, onPress, onInfo }: { pal: Palette; colour: string; title: string; sub?: string; art: ArtName; onPress: () => void; onInfo?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.tile, { backgroundColor: colour, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <Image source={ART[art]} style={styles.tileArt} resizeMode="contain" accessibilityIgnoresInvertColors />
      <View style={{ gap: 3, paddingRight: onInfo ? 26 : 0 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
      </View>
      {!!onInfo && (
        <Pressable onPress={onInfo} hitSlop={10} accessibilityRole="button" accessibilityLabel={`What is ${title}?`} style={styles.tileInfo}>
          <Text style={styles.tileInfoText}>?</Text>
        </Pressable>
      )}
    </Pressable>
  );
}
export function TileGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.tiles}>{children}</View>;
}

export const speedLabel = (x: number) => (x === 1 ? 'Normal' : `${x}×`);

export function Choice({ pal, on, title, sub, onPress, box }: { pal: Palette; on: boolean; title: string; sub?: string; onPress: () => void; box?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, { backgroundColor: on ? mix(pal.surface, pal.accent, pal.dark ? 0.2 : 0.09) : pal.bg, borderColor: on ? pal.accent : 'transparent' }]}
      accessibilityRole={box ? 'switch' : 'radio'}
      accessibilityState={box ? { checked: on } : { selected: on }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: pal.text }]}>{title}</Text>
        {!!sub && <Text style={[styles.sub, { color: pal.muted }]}>{sub}</Text>}
      </View>
      <View style={[box ? styles.box : styles.radio, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? pal.accent : 'transparent' }]}>
        {on && <Icon name="check" size={14} color={pal.onAccent} strokeWidth={2.4} />}
      </View>
    </Pressable>
  );
}

export function Bar({ pal, pct }: { pal: Palette; pct: number }) {
  return (
    <View style={[styles.bar, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.25 : 0.14) }]}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`, height: '100%', backgroundColor: pal.accent, borderRadius: 4 }} />
    </View>
  );
}

export function Stat({ pal, n, label }: { pal: Palette; n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, { color: pal.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {n}
      </Text>
      <Text style={[styles.statL, { color: pal.muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.4%', minHeight: 158, borderRadius: 22, padding: 14, overflow: 'hidden' },
  tileArt: { position: 'absolute', right: -10, bottom: -10, width: 104, height: 104 },
  tileTitle: { fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 21, color: '#FFFFFF', letterSpacing: -0.2 },
  tileSub: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 16, color: 'rgba(255,255,255,0.85)', maxWidth: '78%' },
  tileInfo: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  tileInfoText: { fontFamily: fonts.uiBold, fontSize: 12, lineHeight: 15, color: '#FFFFFF' },
  info: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
  infoText: { fontFamily: fonts.uiBold, fontSize: 13, lineHeight: 16 },
  card: { borderRadius: 16, overflow: 'hidden' },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: fonts.read, fontSize: 21, letterSpacing: -0.4 },
  sub: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  value: { fontFamily: fonts.ui, fontSize: 15 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  stat: { flex: 1, gap: 1 },
  statN: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statL: { fontFamily: fonts.ui, fontSize: 12 },
});
