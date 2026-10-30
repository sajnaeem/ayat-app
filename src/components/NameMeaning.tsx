import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { lookupName } from '@/data/names';
import { fonts, mix, Palette } from '@/lib/theme';
import { Icon } from './Icon';

/** The Arabic spelling and meaning of a person's name, when it's a name we know. Shows nothing otherwise. */
export function NameMeaning({ name, pal, onOpenAyah }: { name: string; pal: Palette; onOpenAyah?: (s: number, a: number) => void }) {
  const e = lookupName(name);
  if (!e) return null;
  return (
    <Animated.View key={e.n} entering={FadeIn.duration(300)} style={[styles.card, { borderColor: mix(pal.bg, pal.accent, 0.35), backgroundColor: mix(pal.bg, pal.accent, 0.06) }]}>
      <View style={styles.top}>
        <Text style={[styles.en, { color: pal.text }]}>{e.n}</Text>
        <Text style={[styles.ar, { color: pal.accent }]}>{e.ar}</Text>
      </View>
      {!!e.m && <Text style={[styles.m, { color: pal.text }]}>“{e.m}”</Text>}
      {!!e.note && <Text style={[styles.note, { color: pal.muted }]}>{e.note}</Text>}
      {e.q &&
        (onOpenAyah ? (
          <Pressable onPress={() => onOpenAyah(e.q!.s, e.q!.a)} style={styles.link} accessibilityRole="button">
            <Icon name="book" size={15} color={pal.accent} />
            <Text style={[styles.linkText, { color: pal.accent }]}>{e.q.label}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.note, { color: pal.accent }]}>In the Quran: {e.q.label}</Text>
        ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  en: { fontFamily: fonts.uiBold, fontSize: 17 },
  ar: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 46 },
  m: { fontFamily: fonts.readItalic, fontSize: 16, lineHeight: 22 },
  note: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  linkText: { fontFamily: fonts.uiSemi, fontSize: 13, flexShrink: 1 },
});
