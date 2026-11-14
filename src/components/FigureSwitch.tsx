import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette } from '@/lib/theme';

/** Brother / sister: which figure the pictures show. Remembered on the phone. */
export function FigureSwitch({ pal, compact }: { pal: Palette; compact?: boolean }) {
  const prefs = usePrefs();
  const fig = prefs.prayFigure ?? 'brother';
  return (
    <View style={[styles.switch, { backgroundColor: mix(pal.surface, pal.text, 0.06) }, compact && { alignSelf: 'flex-start' }]} accessibilityRole="radiogroup">
      {(['brother', 'sister'] as const).map((f) => {
        const on = fig === f;
        return (
          <Pressable key={f} onPress={() => prefs.set({ prayFigure: f })} style={[styles.seg, compact && { paddingHorizontal: 14, paddingVertical: 6 }, on && { backgroundColor: pal.surface }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            <Text style={[styles.segText, { color: on ? pal.text : pal.muted }]}>{f === 'brother' ? 'Brother' : 'Sister'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  seg: { flex: 1, alignItems: 'center', borderRadius: 999, paddingVertical: 9 },
  segText: { fontFamily: fonts.uiSemi, fontSize: 14.5 },
});
