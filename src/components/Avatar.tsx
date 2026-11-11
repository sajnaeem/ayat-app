import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/lib/theme';

const COLOURS = ['#1F6E52', '#2F4FA3', '#A4462F', '#1B6868', '#6B4AA0', '#8A6A1E'];

/** A round initial for a person (no photos yet), its colour picked from their id so it stays the same everywhere. */
export function Avatar({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: COLOURS[h % COLOURS.length] }]}>
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontFamily: fonts.uiBold },
});
