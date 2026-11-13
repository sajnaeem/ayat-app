import { BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Literata_400Regular, Literata_400Regular_Italic } from '@expo-google-fonts/literata';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChooseName } from '@/components/SignIn';
import { ToastProvider } from '@/components/Toast';
import { AccountProvider, useAccount } from '@/lib/account';
import { ProgressProvider } from '@/lib/progress';
import { PrefsProvider, usePrefs } from '@/lib/store';
import { usePalette } from '@/lib/theme';
import { useLiveUpdates } from '@/lib/updates';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const pal = usePalette();
  const { ready } = usePrefs();
  const acct = useAccount();
  useLiveUpdates();
  const [fontsLoaded, fontError] = useFonts({
    NotoNaskhArabic_400Regular,
    Literata_400Regular,
    Literata_400Regular_Italic,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });
  const loaded = (fontsLoaded || !!fontError) && ready && acct.status !== 'loading';

  useEffect(() => {
    // Recitation should still play when the phone's silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  // Signed in: choose a display name first, then the app.
  let gate: React.ReactNode = null;
  // Signed out is fine: the Quran tab works without an account, and sign-in opens when it's needed.
  if (acct.status === 'signedIn' && !acct.profileLoaded)
    gate = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: pal.bg }}>
        <ActivityIndicator color={pal.accent} />
      </View>
    );
  else if (acct.status === 'signedIn' && !acct.handle) gate = <ChooseName />;
  if (gate)
    return (
      <>
        <StatusBar style={pal.dark ? 'light' : 'dark'} />
        {gate}
      </>
    );

  return (
    <>
      <StatusBar style={pal.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pal.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="read" options={{ presentation: 'modal' }} />
        <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
        <Stack.Screen name="signin" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ presentation: 'modal' }} />
        <Stack.Screen name="mosque" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="together/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="together/[id]" />
        <Stack.Screen name="k/[code]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="mushaf" options={{ animation: 'fade' }} />
        <Stack.Screen name="downloads" options={{ presentation: 'modal' }} />
        <Stack.Screen name="qibla" options={{ presentation: 'modal' }} />
        <Stack.Screen name="duas" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tasbeeh" options={{ presentation: 'modal' }} />
        <Stack.Screen name="prayertimes" options={{ presentation: 'modal' }} />
        <Stack.Screen name="stories/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="stories/[id]" />
        <Stack.Screen name="learn/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="learn/[s]" />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <ProgressProvider>
          <AccountProvider>
            <ToastProvider>
              <Root />
            </ToastProvider>
          </AccountProvider>
        </ProgressProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
