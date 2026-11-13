import { View } from 'react-native';
import { mix, Palette } from '@/lib/theme';

/** 30 small segments, one per juz. */
export function KhatmBar({ done, pal, parts }: { done: number; pal: Palette; parts?: ('open' | 'reading' | 'done')[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 30 }, (_, i) => {
        const st = parts?.[i] ?? (i < done ? 'done' : 'open');
        return <View key={i} style={{ flex: 1, height: 6, borderRadius: 2, backgroundColor: st === 'done' ? pal.accent : st === 'reading' ? mix(pal.surface, pal.accent, 0.4) : mix(pal.surface, pal.text, 0.1) }} />;
      })}
    </View>
  );
}

