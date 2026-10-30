import { BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Literata_400Regular, Literata_400Regular_Italic } from '@expo-google-fonts/literata';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/Toast';
import { ProgressProvider } from '@/lib/progress';
import { PrefsProvider, usePrefs } from '@/lib/store';
import { usePalette } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const pal = usePalette();
  const { ready } = usePrefs();
  const [fontsLoaded, fontError] = useFonts({
    NotoNaskhArabic_400Regular,
    Literata_400Regular,
    Literata_400Regular_Italic,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });
  const loaded = (fontsLoaded || !!fontError) && ready;

  useEffect(() => {
    // Recitation should still play when the phone's silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style={pal.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pal.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="surah/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="you" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <ProgressProvider>
          <ToastProvider>
            <Root />
          </ToastProvider>
        </ProgressProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
