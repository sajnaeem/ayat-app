import { StyleSheet, Text, type TextProps } from 'react-native';
import { textScale, usePrefs } from '@/lib/store';

/**
 * Small print that follows You → Reading → Text size (Saj, 28 Nov 2026, improve-loop proposal 10):
 * the notes on A gathering of dua and Read together were 13px whatever the reader chose.
 * It only ever grows: the "Small" setting leaves small print as it is.
 */
export function Scaled({ style, ...rest }: TextProps) {
  const scale = Math.max(1, textScale(usePrefs().textSize));
  const flat = StyleSheet.flatten(style) || {};
  const grown = scale === 1 ? null : { fontSize: flat.fontSize ? Math.round(flat.fontSize * scale) : undefined, lineHeight: flat.lineHeight ? Math.round(flat.lineHeight * scale) : undefined };
  return <Text {...rest} style={[style, grown]} />;
}
