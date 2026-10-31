import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authMessage, useAccount } from '@/lib/account';
import { fonts, usePalette } from '@/lib/theme';
import { GuidelinesSheet } from './Guidelines';
import { NameMeaning } from './NameMeaning';
import { useToast } from './Toast';

type Mode = 'choose' | 'phone' | 'email';

/** UK-friendly: "07700 900123" becomes "+447700900123"; anything starting with + is kept as typed. */
function toE164(raw: string) {
  const d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (d.startsWith('00')) return '+' + d.slice(2);
  if (d.startsWith('0')) return '+44' + d.slice(1);
  return '+' + d;
}

/** The first screen for anyone not signed in. */
/** Google and phone sign-in are built but not switched on in Supabase for the iOS launch. */
const SHOW_GOOGLE = false;
const SHOW_PHONE = false;

/**
 * Sign in or create an account. Shown when someone wants something that needs an account
 * (For you, reflections, their progress); the Quran tab works without one.
 */
export function SignIn({ onClose, reason }: { onClose?: () => void; reason?: string } = {}) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const acct = useAccount();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('choose');
  const [busy, setBusy] = useState(false);
  const [appleOk, setAppleOk] = useState(false);
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newAccount, setNewAccount] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleOk, () => {});
  }, []);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const m = authMessage(e);
      if (m) toast(m);
    } finally {
      setBusy(false);
    }
  };

  const input = [styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }];
  const primary = [styles.btn, { backgroundColor: pal.text }];
  const outline = [styles.btn, { borderColor: pal.line, borderWidth: 1, backgroundColor: pal.surface }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: pal.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={[styles.bism, { color: pal.accent }]}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</Text>
          <Text style={[styles.brand, { color: pal.text }]}>
            munib<Text style={{ color: pal.accent }}>.</Text>
          </Text>
          <Text style={[styles.meaning, { color: pal.muted }]}>
            <Text style={{ fontFamily: 'NotoNaskhArabic_400Regular', color: pal.accent }}>مُنِيب</Text>  ·  one who turns back to Allah (50:33)
          </Text>
          <Text style={[styles.tag, { color: pal.muted }]}>{reason ?? 'Scroll the Quran. A little further every day.'}</Text>
        </View>

        {mode === 'choose' && (
          <View style={styles.stack}>
            {appleOk && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={pal.dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={10}
                style={{ height: 52 }}
                onPress={() => run(acct.signInWithApple)}
              />
            )}
            {SHOW_GOOGLE && (
              <Pressable onPress={() => run(acct.signInWithGoogle)} style={outline} accessibilityRole="button">
                <Text style={[styles.btnText, { color: pal.text }]}>Continue with Google</Text>
              </Pressable>
            )}
            {SHOW_PHONE && (
              <Pressable onPress={() => setMode('phone')} style={outline} accessibilityRole="button">
                <Text style={[styles.btnText, { color: pal.text }]}>Continue with phone number</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setMode('email')} style={outline} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.text }]}>Continue with email</Text>
            </Pressable>
            {onClose && (
              <Pressable onPress={onClose} style={styles.link} accessibilityRole="button">
                <Text style={[styles.linkText, { color: pal.muted }]}>Not now, keep reading the Quran</Text>
              </Pressable>
            )}
          </View>
        )}

        {mode === 'phone' && (
          <View style={styles.stack}>
            <Text style={[styles.label, { color: pal.muted }]}>{codeSent ? `Enter the code we texted to ${toE164(phone)}` : 'Your mobile number'}</Text>
            {!codeSent ? (
              <>
                <TextInput value={phone} onChangeText={setPhone} placeholder="07700 900123" placeholderTextColor={pal.muted} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" style={input} accessibilityLabel="Mobile number" />
                <Pressable
                  onPress={() =>
                    run(async () => {
                      await acct.sendPhoneCode(toE164(phone));
                      setCodeSent(true);
                    })
                  }
                  disabled={phone.replace(/\D/g, '').length < 8}
                  style={[primary, { opacity: phone.replace(/\D/g, '').length < 8 ? 0.4 : 1 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, { color: pal.bg }]}>Text me a code</Text>
                </Pressable>
                <Text style={[styles.fine, { color: pal.muted }]}>UK numbers can start with 0. For other countries, start with + and the country code.</Text>
              </>
            ) : (
              <>
                <TextInput value={code} onChangeText={setCode} placeholder="123456" placeholderTextColor={pal.muted} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={8} style={[input, styles.code]} accessibilityLabel="Code from text message" />
                <Pressable onPress={() => run(() => acct.verifyPhoneCode(toE164(phone), code))} disabled={code.length < 6} style={[primary, { opacity: code.length < 6 ? 0.4 : 1 }]} accessibilityRole="button">
                  <Text style={[styles.btnText, { color: pal.bg }]}>Continue</Text>
                </Pressable>
                <Pressable onPress={() => run(() => acct.sendPhoneCode(toE164(phone)).then(() => toast('New code sent')))} style={styles.link} accessibilityRole="button">
                  <Text style={[styles.linkText, { color: pal.muted }]}>Send a new code</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {mode === 'email' && (
          <View style={styles.stack}>
            <View style={[styles.seg, { borderColor: pal.line }]}>
              {(['Create account', 'Log in'] as const).map((t, i) => {
                const on = newAccount === (i === 0);
                return (
                  <Pressable key={t} onPress={() => setNewAccount(i === 0)} style={[styles.segBtn, on && { backgroundColor: pal.text }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.segText, { color: on ? pal.bg : pal.text }]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={pal.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" style={input} accessibilityLabel="Email" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={newAccount ? 'Choose a password (8+ characters)' : 'Password'}
              placeholderTextColor={pal.muted}
              secureTextEntry
              autoComplete={newAccount ? 'new-password' : 'current-password'}
              textContentType={newAccount ? 'newPassword' : 'password'}
              style={input}
              accessibilityLabel="Password"
            />
            <Pressable
              onPress={() => run(() => (newAccount ? acct.signUpWithEmail(email, password) : acct.signInWithEmail(email, password)))}
              disabled={!email.includes('@') || password.length < (newAccount ? 8 : 1)}
              style={[primary, { opacity: !email.includes('@') || password.length < (newAccount ? 8 : 1) ? 0.4 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: pal.bg }]}>{newAccount ? 'Create account' : 'Log in'}</Text>
            </Pressable>
          </View>
        )}

        {mode !== 'choose' && (
          <Pressable
            onPress={() => {
              setMode('choose');
              setCodeSent(false);
              setCode('');
            }}
            style={styles.link}
            accessibilityRole="button"
          >
            <Text style={[styles.linkText, { color: pal.muted }]}>Other ways to continue</Text>
          </Pressable>
        )}

        {busy && <ActivityIndicator color={pal.accent} style={{ marginTop: 12 }} />}

        <Text style={[styles.fine, { color: pal.muted, textAlign: 'center', marginTop: 'auto' }]}>
          Munib is free. Your account keeps your progress, saved ayat and reflections safe across phones.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Shown once after signing up: everyone has a display name before entering the app. */
export function ChooseName() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const acct = useAccount();
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [reading, setReading] = useState(false);
  const ok = name.trim().length >= 2 && agreed;
  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await acct.setHandle(name);
      // Recorded on the account; if this fails, they'll be asked again before their first reflection.
      await acct.acceptGuidelines().catch(() => {});
    } catch {
      toast("Couldn't save — check your connection and try again");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: pal.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.wrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 28, justifyContent: 'center' }]}>
        <Text style={[styles.title, { color: pal.text }]}>What should we call you?</Text>
        <Text style={[styles.tag, { color: pal.muted, textAlign: 'left' }]}>This is the name people see on your reflections. You can change it later.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Saj"
          placeholderTextColor={pal.muted}
          maxLength={32}
          autoFocus
          autoComplete="nickname"
          returnKeyType="done"
          onSubmitEditing={save}
          style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface, marginTop: 8 }]}
          accessibilityLabel="Display name"
        />
        <NameMeaning name={name} pal={pal} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <Pressable
            onPress={() => setAgreed((a) => !a)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="I agree to the community guidelines"
            style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: agreed ? pal.accent : pal.muted, backgroundColor: agreed ? pal.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
          >
            {agreed && <Text style={{ color: pal.onAccent, fontFamily: fonts.uiBold, fontSize: 15, lineHeight: 18 }}>✓</Text>}
          </Pressable>
          <Text style={[styles.fine, { color: pal.text, flex: 1, fontSize: 14, lineHeight: 20 }]}>
            I agree to Munib's{' '}
            <Text onPress={() => setReading(true)} style={{ textDecorationLine: 'underline', fontFamily: fonts.uiSemi }} accessibilityRole="link">
              community guidelines
            </Text>
            : be kind, no hate, no abuse.
          </Text>
        </View>
        <GuidelinesSheet visible={reading} onClose={() => setReading(false)} pal={pal} />
        <Pressable onPress={save} disabled={!ok || busy} style={[styles.btn, { backgroundColor: pal.text, opacity: ok && !busy ? 1 : 0.4 }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.bg }]}>{busy ? 'Saving…' : 'Continue'}</Text>
        </Pressable>
        <Pressable onPress={() => acct.signOut()} style={styles.link} accessibilityRole="button">
          <Text style={[styles.linkText, { color: pal.muted }]}>Use a different account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 24, gap: 14 },
  hero: { alignItems: 'center', gap: 6, marginBottom: 28 },
  bism: { fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 24, lineHeight: 48, textAlign: 'center' },
  brand: { fontFamily: fonts.uiBold, fontSize: 52, letterSpacing: -1.5 },
  meaning: { fontFamily: fonts.ui, fontSize: 14, textAlign: 'center', marginBottom: 4 },
  tag: { fontFamily: fonts.read, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  title: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: -0.6, lineHeight: 35 },
  stack: { gap: 10 },
  label: { fontFamily: fonts.uiSemi, fontSize: 14 },
  input: { fontFamily: fonts.ui, fontSize: 17, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  code: { fontSize: 24, letterSpacing: 6, textAlign: 'center', fontVariant: ['tabular-nums'] },
  btn: { minHeight: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  link: { alignSelf: 'center', padding: 10 },
  linkText: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
  fine: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  segText: { fontFamily: fonts.uiSemi, fontSize: 14 },
});
