import { requireOptionalNativeModule } from 'expo-modules-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { TV } from '@/data/live';
import { ART } from '@/lib/art';
import { stopRadio } from '@/lib/radio';
import { SITE } from '@/lib/site';
import { fonts } from '@/lib/theme';

/**
 * Watch live inside Munib (Saj, 14 Nov 2026: "not let people leave the app when it comes to YouTube").
 * Plays the broadcaster's official YouTube live stream in YouTube's own embedded player, from a tiny page on
 * Munib's website (website/watch/?c=makkah), shown in Expo's built-in web view (@expo/dom-webview, already
 * in build 1.2.0). If that view isn't in the build, it falls back to the in-app browser sheet.
 */
const hasWebView = Platform.OS === 'web' || !!requireOptionalNativeModule('DomWebViewModule');
// Loaded lazily so a build without the native view never touches it.
const WebView: any = hasWebView ? require('@expo/dom-webview').WebView : null;

export default function Watch() {
  const { c } = useLocalSearchParams<{ c: string }>();
  const ch = TV.find((t) => t.id === c) ?? TV[0];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Platform.OS === 'web' ? Math.min(width, 520) : width;
  const url = `${SITE}/watch/?c=${ch.id}`;

  useEffect(() => {
    stopRadio();
    if (!hasWebView) {
      // Older builds: the YouTube page in the in-app browser, as before.
      WebBrowser.openBrowserAsync(ch.url).catch(() => Linking.openURL(ch.url)).finally(() => router.back());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.x} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ch.name}</Text>
          <Text style={styles.sub}>{ch.place}</Text>
        </View>
        <View style={styles.pill}>
          <View style={styles.dot} />
          <Text style={styles.pillText}>LIVE</Text>
        </View>
      </View>

      <View style={{ width: w, height: (w * 9) / 16, backgroundColor: '#000' }}>
        {hasWebView && (
          <WebView
            source={{ uri: url }}
            style={{ flex: 1, backgroundColor: '#000' }}
            containerStyle={{ flex: 1, backgroundColor: '#000' }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            scrollEnabled={false}
          />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 30 }}>
        <View style={styles.about}>
          <Image source={ART[ch.art]} style={{ width: 64, height: 64 }} resizeMode="contain" />
          <Text style={styles.note}>{ch.note}. Broadcast by the Saudi Broadcasting Authority, in YouTube’s player. Turn your phone sideways or tap the full-screen button for a bigger picture.</Text>
        </View>
        <Text style={styles.small}>Watch the other Holy Mosque</Text>
        {TV.filter((t) => t.id !== ch.id).map((t) => (
          <Pressable key={t.id} onPress={() => router.replace({ pathname: '/watch', params: { c: t.id } })} style={({ pressed }) => [styles.other, { opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
            <Image source={ART[t.art]} style={{ width: 44, height: 44 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.otherTitle}>{t.name}</Text>
              <Text style={styles.sub}>{t.place}</Text>
            </View>
            <Icon name="chevron" size={16} color="rgba(255,255,255,0.6)" />
          </Pressable>
        ))}
        <Pressable onPress={() => WebBrowser.openBrowserAsync(ch.url).catch(() => Linking.openURL(ch.url))} style={styles.yt} accessibilityRole="button">
          <Text style={styles.ytText}>Not playing? Open it on YouTube</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E14' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  x: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.read, fontSize: 24, color: '#FFFFFF', letterSpacing: -0.4 },
  sub: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E5484D', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  pillText: { fontFamily: fonts.uiBold, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.8 },
  about: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flex: 1, fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.78)' },
  small: { fontFamily: fonts.uiSemi, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  other: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 12 },
  otherTitle: { fontFamily: fonts.uiSemi, fontSize: 16, color: '#FFFFFF' },
  yt: { alignSelf: 'center', paddingVertical: 10 },
  ytText: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },
});
