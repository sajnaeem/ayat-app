import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, Palette } from '@/lib/theme';
import { Icon } from './Icon';

/** A bottom sheet: slides up over a dimmed backdrop, tap outside or ✕ to close. */
export function Sheet({ visible, onClose, title, pal, children }: { visible: boolean; onClose: () => void; title: string; pal: Palette; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.wrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: pal.scrim }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: pal.surface, borderColor: pal.line, paddingBottom: insets.bottom + 14 }]}>
          <View style={[styles.head, { borderBottomColor: pal.line }]}>
            <Text style={[styles.title, { color: pal.text }]}>{title}</Text>
            <Pressable onPress={onClose} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Icon name="close" size={16} color={pal.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 20, letterSpacing: -0.2 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 10 },
});
