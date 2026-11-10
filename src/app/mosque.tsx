import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { ALERT_CHOICES, Alerts, clock, findMosque, isFriday, Mosque, MosqueDay, mosqueTimes, PRAYERS, scheduleMosqueAlerts, todayIso } from '@/lib/mosque';
import { askPermission } from '@/lib/reminders';
import { usePrefs } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const MESSAGES: Record<string, string> = {
  not_found: 'We couldn’t find a prayer timetable there. Try the page on the mosque’s website that shows the times.',
  off: 'Mosque prayer times are being switched on. Please try again soon.',
  limit: 'You’ve added a few mosques today. Please try again tomorrow.',
  bad_url: 'That doesn’t look like a website address. Try something like mymosque.org/prayer-times.',
  failed: 'Something went wrong. Check your connection and try again.',
};

/**
 * My mosque: paste the mosque's website, check today's times, then choose alerts before each jama'ah.
 * The mosque is remembered on this phone only; alerts are planned on the phone (see src/lib/mosque.ts).
 */
export default function MosqueScreen() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const prefs = usePrefs();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  // A mosque that's been found but not yet confirmed, or the one followed.
  const [found, setFound] = useState<{ mosque: Mosque; days: MosqueDay[] } | null>(null);
  const [current, setCurrent] = useState<{ mosque: Mosque; days: MosqueDay[] } | null>(null);

  useEffect(() => {
    if (prefs.mosque) mosqueTimes(prefs.mosque.id).then(setCurrent);
  }, [prefs.mosque]);

  const find = async () => {
    if (!url.trim() || busy) return;
    if (acct.status !== 'signedIn') return router.push({ pathname: '/signin', params: { why: 'mosque' } });
    setBusy(true);
    setProblem('');
    const r = await findMosque(url.trim());
    setBusy(false);
    if ('mosque' in r) {
      if (!r.days.length) return setProblem(MESSAGES.not_found);
      setFound(r);
    } else if (r.error === 'sign_in') router.push({ pathname: '/signin', params: { why: 'mosque' } });
    else setProblem(MESSAGES[r.error] ?? MESSAGES.failed);
  };

  const plan = async (data: { mosque: Mosque; days: MosqueDay[] }, alerts: Alerts, jumuah: number) => {
    const ok = await askPermission();
    if (!ok) toast('Notifications are off for Munib. You can allow them in iPhone Settings.');
    await scheduleMosqueAlerts({ ...data, alerts, jumuah }).catch(() => {});
  };

  const confirm = async () => {
    if (!found) return;
    prefs.set({ mosque: { id: found.mosque.id, name: found.mosque.name, url: found.mosque.url } });
    setCurrent(found);
    setFound(null);
    await plan(found, prefs.prayerAlerts, prefs.jumuah);
    toast('Prayer alerts are on');
  };

  const setAlert = (id: keyof Alerts, v: number | null) => {
    const alerts = { ...prefs.prayerAlerts, [id]: v };
    prefs.set({ prayerAlerts: alerts });
    if (current) plan(current, alerts, prefs.jumuah);
  };
  const setJumuah = (i: number) => {
    prefs.set({ jumuah: i });
    if (current) plan(current, prefs.prayerAlerts, i);
  };

  const reportWrong = async (m: Mosque) => {
    try {
      await supabase?.from('feedback').insert({ user_id: acct.userId, kind: 'bug', message: `Prayer times look wrong for ${m.name} (${m.url})`, meta: { source: 'mosque', mosque: m.id } });
      toast('Thank you. We’ll check this mosque’s times');
    } catch {
      toast('Couldn’t send. Check your connection');
    }
  };

  const stop = async () => {
    prefs.set({ mosque: null });
    setCurrent(null);
    await scheduleMosqueAlerts(null);
    toast('Prayer alerts are off');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>My mosque</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {found ? (
          <>
            <Text style={[styles.h2, { color: pal.text }]}>{found.mosque.name}</Text>
            <Text style={[styles.small, { color: pal.muted }]}>Here are today’s times we read from the mosque’s website. Do they match the timetable?</Text>
            <Times day={found.days[0]} mosque={found.mosque} pal={pal} />
            <Pressable onPress={confirm} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.bg }]}>Yes, set up my alerts</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                reportWrong(found.mosque);
                setFound(null);
              }}
              style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: pal.text }]}>No, something’s wrong</Text>
            </Pressable>
          </>
        ) : current && prefs.mosque ? (
          <>
            <Text style={[styles.h2, { color: pal.text }]}>{current.mosque.name}</Text>
            <Text style={[styles.small, { color: pal.muted }]}>
              Times from {host(current.mosque.url)}
              {current.mosque.checked_at ? `, checked ${new Date(current.mosque.checked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}.
            </Text>
            {current.days[0] ? <Times day={current.days.find((d) => d.day >= todayIso()) ?? current.days[0]} mosque={current.mosque} pal={pal} /> : <Text style={[styles.small, { color: pal.muted }]}>No times for the coming days yet. We’ll keep checking.</Text>}

            <Text style={[styles.h3, { color: pal.muted }]}>ALERT ME BEFORE JAMA’AH</Text>
            {PRAYERS.map((p) => (
              <View key={p.id} style={{ gap: 6 }}>
                <Text style={[styles.prayer, { color: pal.text }]}>{p.id === 'dhuhr' && current.mosque.jumuah.length ? 'Dhuhr (and Jumuʿah)' : p.name}</Text>
                <View style={styles.chips}>
                  {ALERT_CHOICES.map((c) => {
                    const on = prefs.prayerAlerts[p.id] === c;
                    return (
                      <Pressable key={String(c)} onPress={() => setAlert(p.id, c)} style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.bg, pal.accent, 0.12) : pal.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                        <Text style={[styles.chipText, { color: pal.text }]}>{c === null ? 'Off' : c === 0 ? 'On time' : `${c} min`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {current.mosque.jumuah.length > 1 && (
              <View style={{ gap: 6 }}>
                <Text style={[styles.prayer, { color: pal.text }]}>On Fridays, remind me for</Text>
                <View style={styles.chips}>
                  {current.mosque.jumuah.map((t, i) => {
                    const on = prefs.jumuah === i;
                    return (
                      <Pressable key={t} onPress={() => setJumuah(i)} style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.bg, pal.accent, 0.12) : pal.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                        <Text style={[styles.chipText, { color: pal.text }]}>{`${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'} Jumuʿah · ${clock(t)}`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <Text style={[styles.small, { color: pal.muted }]}>
              Alerts are planned on your phone for the next week and topped up whenever you open Munib. Which mosque you follow stays on your phone.
            </Text>
            <Pressable onPress={() => reportWrong(current.mosque)} accessibilityRole="button">
              <Text style={[styles.small, { color: pal.muted, textDecorationLine: 'underline' }]}>Times look wrong? Tell us</Text>
            </Pressable>
            <Pressable onPress={stop} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.text }]}>Change mosque or turn off alerts</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.h2, { color: pal.text }]}>Never miss jama’ah</Text>
            <Text style={[styles.body2, { color: pal.muted }]}>
              Paste your mosque’s website and Munib will read its prayer timetable, then remind you before each jama’ah, as early as you need to get there.
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="e.g. mymosque.org/prayer-times"
              placeholderTextColor={pal.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={find}
              style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
            />
            <Pressable onPress={find} disabled={busy || !url.trim()} style={[styles.btn, { backgroundColor: pal.text, opacity: busy || !url.trim() ? 0.5 : 1 }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>Find prayer times</Text>}
            </Pressable>
            {busy && <Text style={[styles.small, { color: pal.muted, textAlign: 'center' }]}>Reading the mosque’s timetable. The first time can take up to a minute.</Text>}
            {!!problem && <Text style={[styles.small, { color: '#B4432F' }]}>{problem}</Text>}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const host = (u: string) => u.replace(/^https?:\/\//, '').split('/')[0];

/** Today's (or the next day's) times: when each prayer starts, and its jama'ah. */
function Times({ day, mosque, pal }: { day: MosqueDay; mosque: Mosque; pal: Palette }) {
  const friday = isFriday(day.day);
  const label = new Date(`${day.day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <View style={[styles.table, { borderColor: pal.line, backgroundColor: pal.surface }]}>
      <View style={styles.row}>
        <Text style={[styles.th, { color: pal.muted, flex: 1.4 }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.th, { color: pal.muted }]}>STARTS</Text>
        <Text style={[styles.th, { color: pal.muted }]}>JAMA’AH</Text>
      </View>
      {PRAYERS.map((p) => (
        <View key={p.id} style={[styles.row, { borderColor: pal.line, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Text style={[styles.td, { color: pal.text, flex: 1.4, fontFamily: fonts.uiBold }]}>{p.name}</Text>
          <Text style={[styles.td, { color: pal.muted }]}>{clock(day[p.id])}</Text>
          <Text style={[styles.td, { color: pal.text }]}>{clock(day[`${p.id}_j`])}</Text>
        </View>
      ))}
      {friday && mosque.jumuah.length > 0 && (
        <View style={[styles.row, { borderColor: pal.line, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Text style={[styles.td, { color: pal.text, flex: 1.4, fontFamily: fonts.uiBold }]}>Jumuʿah</Text>
          <Text style={[styles.td, { color: pal.text, flex: 2 }]}>{mosque.jumuah.map(clock).join(' · ')}</Text>
        </View>
      )}
      {!!day.sunrise && <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 14, paddingBottom: 12 }]}>Sunrise {clock(day.sunrise)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 14 },
  h2: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 8 },
  body2: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  input: { fontFamily: fonts.ui, fontSize: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  table: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  th: { flex: 1, fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 0.8 },
  td: { flex: 1, fontFamily: fonts.ui, fontSize: 15 },
  prayer: { fontFamily: fonts.uiSemi, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
});
