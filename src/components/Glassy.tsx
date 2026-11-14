import type { ComponentType, ReactNode } from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';

/**
 * Apple's liquid glass where the phone has it (iOS 26+; the native part, ExpoGlassEffect, has been in Munib since
 * build 1.2.0), and a plain solid panel everywhere else: older iPhones, Android and the web. Loaded carefully, so a
 * phone without it never sees an error.
 */
type GlassProps = { style?: StyleProp<ViewStyle>; glassEffectStyle?: 'regular' | 'clear'; tintColor?: string; isInteractive?: boolean; colorScheme?: 'auto' | 'light' | 'dark'; children?: ReactNode };
let GlassView: ComponentType<GlassProps> | null = null;
let ok = false;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const g = require('expo-glass-effect');
    ok = !!g.isLiquidGlassAvailable?.();
    if (ok) GlassView = g.GlassView;
  } catch {
    ok = false;
  }
}
/** True when real glass is drawn (so what sits on it can drop its own background and border). */
export const hasGlass = ok;

export function Glassy({ style, fallback, tint, dark, interactive, children }: { style?: StyleProp<ViewStyle>; /** the look without glass */ fallback?: StyleProp<ViewStyle>; tint?: string; dark?: boolean; interactive?: boolean; children?: ReactNode }) {
  if (GlassView)
    return (
      <GlassView style={style} glassEffectStyle="regular" tintColor={tint} isInteractive={interactive} colorScheme={dark ? 'dark' : 'light'}>
        {children}
      </GlassView>
    );
  return <View style={[style, fallback]}>{children}</View>;
}
