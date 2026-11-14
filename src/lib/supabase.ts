import 'expo-sqlite/localStorage/install';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// The URL and publishable key are public by design (row-level security protects the data). They are written here as
// well as in .env because `eas update --environment production` skips .env files, which published updates with no
// server on 14 Nov 2026 (Apple sign-in did nothing).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://skuhimrzjddujzwdedot.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_JWfeg2nuIB6XrdtTCzzpzA_b952cZJk';

/** Null until the project's URL and publishable key are set in `.env`; the app then works fully offline on the phone. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
      })
    : null;

// Keep the session fresh only while the app is open.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
