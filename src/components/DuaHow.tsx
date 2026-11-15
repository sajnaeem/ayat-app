import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { fonts, mix, type Palette } from '@/lib/theme';

/**
 * How to make dua for someone, briefly, with one full example (Saj, 15 Nov 2026: "give an example full dua so people
 * understand"). Shown on the Ask for dua page; Daily deeds' dua row opens that page with it open.
 * The steps come from the Sunnah; the example is Munib's own wording around the salawat and Quran 2:201, to show
 * that dua can be made in your own words. All of it needs a scholar's check.
 */
const STEPS = [
  { t: 'Begin by praising Allah', d: 'Then send blessings on the Prophet ﷺ.', src: 'Tirmidhi 3477' },
  { t: 'Ask for them by name', d: 'In any language, in your own words: their health, guidance, forgiveness, ease.', src: '' },
  { t: 'Ask for the good of both worlds', d: 'For them and for yourself.', src: 'Quran 2:201' },
  { t: 'Ask with certainty, then say Ameen', d: 'With hope, and without rushing to see it answered.', src: 'Tirmidhi 3479' },
];

const EXAMPLE: { tl?: string; en: string; own?: boolean }[] = [
  { tl: 'Alhamdulillahi Rabbil-ʿaalameen.', en: 'All praise is for Allah, Lord of the worlds.' },
  { tl: 'Allaahumma salli ʿalaa Muhammad.', en: 'O Allah, send Your blessings on Muhammad.' },
  { own: true, en: 'O Allah, heal my mother, ease her pain and forgive her. Give my friend Yusuf the work he is looking for, and keep him close to You. Guide us all, and protect the ones we love.' },
  { tl: 'Rabbanaa aatinaa fid-dunyaa hasanah, wa fil-aakhirati hasanah, wa qinaa ʿadhaaban-naar.', en: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.' },
  { tl: 'Aameen.', en: '' },
];

export function DuaHow({ pal, open: startOpen = false }: { pal: Palette; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
      <Pressable onPress={() => setOpen((x) => !x)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: pal.accent }]}>NEW TO THIS?</Text>
          <Text style={[styles.title, { color: pal.text }]}>How to make dua for someone</Text>
        </View>
        <View style={[styles.go, { backgroundColor: mix(pal.surface, pal.accent, 0.1), transform: [{ rotate: open ? '-90deg' : '90deg' }] }]}>
          <Icon name="chevron" size={14} color={pal.accent} />
        </View>
      </Pressable>

      {open && (
        <View style={{ gap: 12 }}>
          {STEPS.map((h, i) => (
            <View key={h.t} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={[styles.n, { color: pal.accent }]}>{i + 1}</Text>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[styles.stepT, { color: pal.text }]}>{h.t}</Text>
                <Text style={[styles.sub, { color: pal.muted }]}>
                  {h.d}
                  {h.src ? `  · ${h.src}` : ''}
                </Text>
              </View>
            </View>
          ))}

          <View style={[styles.example, { backgroundColor: mix(pal.surface, pal.accent, 0.06), borderColor: mix(pal.line, pal.accent, 0.25) }]}>
            <Text style={[styles.eyebrow, { color: pal.accent }]}>AN EXAMPLE</Text>
            {EXAMPLE.map((l, i) => (
              <View key={i} style={{ gap: 2 }}>
                {!!l.tl && <Text style={[styles.tl, { color: pal.accent }]}>{l.tl}</Text>}
                {!!l.en && <Text style={[styles.en, { color: pal.text }, l.own && styles.own]}>{l.en}</Text>}
                {l.own && <Text style={[styles.sub, { color: pal.muted }]}>Your own words, for the people you're praying for</Text>}
              </View>
            ))}
          </View>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.3 },
  title: { fontFamily: fonts.read, fontSize: 19, marginTop: 1 },
  go: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  n: { fontFamily: fonts.read, fontSize: 18, lineHeight: 21, width: 14 },
  stepT: { fontFamily: fonts.uiSemi, fontSize: 14.5 },
  sub: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 17 },
  example: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  tl: { fontFamily: fonts.readItalic, fontSize: 15, lineHeight: 21 },
  en: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22 },
  own: { fontFamily: fonts.read, fontSize: 15.5 },
});
