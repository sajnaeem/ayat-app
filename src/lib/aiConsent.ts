import { Alert, Platform } from 'react-native';

/**
 * Asking before anything a reader types goes to an AI company (App Store guideline 5.1.2(i), Nov 2025: apps must say
 * where personal data is shared with third-party AI and get explicit permission first). Munib's AI features (Ask,
 * Ask about this ayah, Find a dua's search and the first check on posts) send text to Anthropic, the company that
 * makes Claude. Asked once; the answer is kept in prefs.aiConsent and can be changed in You → Privacy → Your data.
 */
export const AI_CONSENT_TITLE = 'Answers written by Claude';
export const AI_CONSENT_TEXT =
  'To answer, Munib sends what you type to Anthropic, the company that makes the AI Claude. We never send your name, email or account. Munib doesn’t keep your questions, and Anthropic doesn’t use them to train its AI. You can change this any time in You → Your data.';

type Prefs = { aiConsent?: boolean; set: (p: { aiConsent: boolean }) => void };

/** True when the reader allows it (asking first if they haven't been asked, or if `askAgain` and they said no before). */
export function askAiConsent(prefs: Prefs, askAgain = true): Promise<boolean> {
  if (prefs.aiConsent === true) return Promise.resolve(true);
  if (prefs.aiConsent === false && !askAgain) return Promise.resolve(false);
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${AI_CONSENT_TITLE}\n\n${AI_CONSENT_TEXT}`);
    prefs.set({ aiConsent: ok });
    return Promise.resolve(ok);
  }
  return new Promise((done) =>
    Alert.alert(AI_CONSENT_TITLE, AI_CONSENT_TEXT, [
      { text: 'Not now', style: 'cancel', onPress: () => (prefs.set({ aiConsent: false }), done(false)) },
      { text: 'Allow', onPress: () => (prefs.set({ aiConsent: true }), done(true)) },
    ], { cancelable: true, onDismiss: () => done(false) }),
  );
}
