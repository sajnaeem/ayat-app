import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, usePalette } from '@/lib/theme';

const C = createContext<(msg: string) => void>(() => {});

/** Short messages that float up from the bottom and fade after a few seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), text });
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <C.Provider value={show}>
      {children}
      {msg && (
        <Animated.View key={msg.id} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(200)} pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 26 }]}>
          <Text style={[styles.text, { backgroundColor: pal.text, color: pal.bg }]} accessibilityLiveRegion="polite">
            {msg.text}
          </Text>
        </Animated.View>
      )}
    </C.Provider>
  );
}

export const useToast = () => useContext(C);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  text: { fontFamily: fonts.uiSemi, fontSize: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, overflow: 'hidden', textAlign: 'center' },
});
