import { StyleSheet, Text, View } from 'react-native';
import { fonts, Palette } from '@/lib/theme';
import { Sheet } from './Sheet';

/** Munib's community guidelines. Agreed to before anyone can post a reflection (Apple requires this for apps with user posts). */
export const GUIDELINES: { title: string; body: string }[] = [
  { title: 'Be kind', body: 'No insults, mockery, harassment or bullying, of anyone.' },
  { title: 'Stay with the ayah', body: 'Share what it means to you, encourage others, ask sincere questions. Munib is not a place for arguments or debates between groups.' },
  { title: "Don't give rulings", body: 'Share what moved you, not fatwas. For religious rulings, point people to a qualified scholar.' },
  { title: 'No hate', body: 'Nothing attacking anyone for their religion, sect, race, ethnicity, gender, disability or any other part of who they are.' },
  { title: 'Nothing harmful', body: 'Nothing sexual, violent or extreme, and nothing that encourages anyone to harm themselves or others.' },
  { title: 'No spam', body: 'No adverts, links, selling or asking for money.' },
  { title: 'Protect privacy', body: "Don't share personal details: phone numbers, addresses, or other people's names and stories without their permission." },
];

export const ZERO_TOLERANCE =
  'Munib has zero tolerance for abusive content or behaviour. Anything that breaks these guidelines is removed, and accounts that break them can be suspended or removed. Report anything that worries you: we review reports within 24 hours. You can also block anyone, and you will no longer see each other’s reflections.';

export function GuidelinesList({ pal }: { pal: Palette }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.intro, { color: pal.text }]}>Reflections are for sharing what an ayah means to you. Help keep Munib a place people feel safe coming back to.</Text>
      {GUIDELINES.map((g, i) => (
        <View key={g.title} style={styles.item}>
          <Text style={[styles.num, { color: pal.accent }]}>{i + 1}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.title, { color: pal.text }]}>{g.title}</Text>
            <Text style={[styles.body, { color: pal.muted }]}>{g.body}</Text>
          </View>
        </View>
      ))}
      <Text style={[styles.body, { color: pal.text }]}>{ZERO_TOLERANCE}</Text>
      <Text style={[styles.body, { color: pal.muted }]}>
        If you are struggling, you are not alone: choose a feeling on the feed and tap "Someone to talk to". If anyone is in immediate danger, call 999.
      </Text>
    </View>
  );
}

export function GuidelinesSheet({ visible, onClose, pal }: { visible: boolean; onClose: () => void; pal: Palette }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Community guidelines" pal={pal}>
      <GuidelinesList pal={pal} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.read, fontSize: 16, lineHeight: 23 },
  item: { flexDirection: 'row', gap: 12 },
  num: { fontFamily: fonts.uiBold, fontSize: 16, width: 16 },
  title: { fontFamily: fonts.uiBold, fontSize: 15 },
  body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
});
