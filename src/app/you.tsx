import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { NameMeaning } from '@/components/NameMeaning';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { RECITERS } from '@/lib/audio';
import { dayKey, surahDone, useProgress } from '@/lib/progress';
import { LANGS, LEVELS, SURAHS, VERSES } from '@/lib/quran';
import { askPermission, REMINDER_TIMES } from '@/lib/reminders';
import { usePrefs } from '@/lib/store';
import { fonts, Palette, usePalette } from '@/lib/theme';

/** Juz' ʿAmma: surahs 78–114, 564 ayat. */
const JUZ_AMMA_FIRST = 78;
const JUZ_AMMA_AYAT = 564;

export default function You() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const { progress, level } = useProgress();
  const acct = useAccount();
  const toast = useToast();
  const [name, setName] = useState(acct.handle ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setName(acct.handle ?? ''), [acct.handle]);
  const saveName = async () => {
    if (name.trim().length < 2) return toast('Choose a display name of at least 2 letters');
    try {
      await acct.setHandle(name);
      toast('Name saved');
    } catch {
      toast("Couldn't save — check your connection and try again");
    }
  };

  const cur = LEVELS[level - 1];
  const next = LEVELS[level];
  const toNext = next ? Math.max(0, Math.ceil(next.at - progress.readings)) : 0;
  const levelPct = next ? Math.min(1, (progress.readings - cur.at) / (next.at - cur.at)) : 1;

  let week = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    week += progress.days[dayKey(d)] ?? 0;
  }
  const total = Object.keys(progress.ayat).length;
  const done = SURAHS.map((_, i) => i + 1).filter((s) => surahDone(progress, s));
  const juz = Object.keys(progress.ayat).filter((k) => Number(k.split(':')[0]) >= JUZ_AMMA_FIRST).length;
  const saves = Object.entries(prefs.saves).sort((a, b) => b[1] - a[1]);

  const openKey = (k: string) => {
    const [s, ab] = k.split(':');
    const [a, b] = ab.split('-');
    router.push({ pathname: '/surah/[id]', params: { id: s, from: a, to: b ?? a } });
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderBottomColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>You</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back to the feed" hitSlop={8}>
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.block}>
          <View style={styles.rowBetween}>
            <Text style={[styles.strong, { color: pal.text }]}>
              Level {level} · {cur.name}
            </Text>
          </View>
          <Bar pal={pal} pct={levelPct} />
          <Text style={[styles.small, { color: pal.muted }]}>
            {next ? `${toNext} more readings to unlock ${next.name.toLowerCase()}` : 'All levels unlocked. Your feed now includes longer readings.'}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat pal={pal} n={week} label="This week" />
          <Stat pal={pal} n={total} label="Ayat read" />
          <Stat pal={pal} n={done.length} label="Surahs done" />
          <Stat pal={pal} n={Object.keys(progress.mem).length} label="Memorised" />
        </View>

        <View style={styles.block}>
          <View style={styles.rowBetween}>
            <Text style={[styles.strong, { color: pal.text }]}>Juz' ʿAmma</Text>
            <Text style={[styles.small, { color: pal.muted }]}>
              {juz} of {JUZ_AMMA_AYAT} ayat
            </Text>
          </View>
          <Bar pal={pal} pct={juz / JUZ_AMMA_AYAT} />
        </View>

        {done.length > 0 && (
          <View style={styles.chips}>
            {done.map((s) => (
              <Pressable key={s} onPress={() => openKey(`${s}:1`)} style={[styles.chip, { backgroundColor: pal.surface, borderColor: pal.line }]} accessibilityRole="button">
                <Text style={[styles.chipText, { color: pal.text }]}>{SURAHS[s - 1][0]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.h3, { color: pal.muted }]}>SAVED AYAT</Text>
        {saves.length === 0 ? (
          <Text style={[styles.small, { color: pal.muted }]}>Tap the bookmark on any ayah to keep it here.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {saves.map(([k]) => {
              const v = VERSES.find((x) => x.k === k);
              const [s] = k.split(':');
              const preview = v ? (v.tr[prefs.lang] ?? v.tr.en ?? []).join(' ') : `${SURAHS[Number(s) - 1][0]}`;
              return (
                <Pressable key={k} onPress={() => openKey(k)} style={[styles.saved, { borderColor: pal.line }]} accessibilityRole="button">
                  <Text style={[styles.savedKey, { color: pal.accent }]}>{k.replace('-', '–')}</Text>
                  <Text style={[styles.savedText, { color: pal.text }]} numberOfLines={1}>
                    {preview}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {acct.online && (
          <>
            <Text style={[styles.h3, { color: pal.muted }]}>DISPLAY NAME</Text>
            <View style={styles.nameRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Shown on your reflections"
                placeholderTextColor={pal.muted}
                maxLength={32}
                style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
                accessibilityLabel="Display name"
              />
              <Pressable onPress={saveName} style={[styles.save, { backgroundColor: pal.text }]} accessibilityRole="button">
                <Text style={[styles.saveText, { color: pal.bg }]}>Save</Text>
              </Pressable>
            </View>
            {!!acct.handle && <NameMeaning name={acct.handle} pal={pal} onOpenAyah={(s, a) => router.push({ pathname: '/surah/[id]', params: { id: String(s), from: String(a), to: String(a) } })} />}
            <Text style={[styles.small, { color: pal.muted }]}>
              Your likes, saves and progress are backed up to your account automatically.
            </Text>
          </>
        )}

        <Text style={[styles.h3, { color: pal.muted }]}>DAILY REMINDER</Text>
        <View style={styles.grid}>
          <Option
            pal={pal}
            on={!prefs.reminders.on}
            title="Off"
            sub="No reminders"
            onPress={() => prefs.set({ remindersOffered: true, reminders: { ...prefs.reminders, on: false } })}
          />
          {REMINDER_TIMES.map((t) => (
            <Option
              key={t.label}
              pal={pal}
              on={prefs.reminders.on && prefs.reminders.hour === t.hour && prefs.reminders.minute === t.minute}
              title={t.label}
              sub={t.sub}
              onPress={async () => {
                const ok = await askPermission();
                if (!ok) return toast('Notifications are off for Munib. You can allow them in iPhone Settings.');
                prefs.set({ remindersOffered: true, reminders: { ...prefs.reminders, on: true, hour: t.hour, minute: t.minute } });
                toast(`Daily reminder set for ${t.sub}`);
              }}
            />
          ))}
        </View>
        {prefs.reminders.on && (
          <Pressable
            onPress={() => prefs.set({ reminders: { ...prefs.reminders, friday: !prefs.reminders.friday } })}
            style={[styles.saved, { borderColor: pal.line }]}
            accessibilityRole="switch"
            accessibilityState={{ checked: prefs.reminders.friday }}
          >
            <Text style={[styles.savedText, { color: pal.text, fontFamily: fonts.ui }]}>On Fridays, remind me to read Surah al-Kahf</Text>
            <View style={[styles.check, { borderColor: prefs.reminders.friday ? pal.accent : pal.line, backgroundColor: prefs.reminders.friday ? pal.accent : 'transparent' }]}>
              {prefs.reminders.friday && <Text style={{ color: pal.onAccent, fontFamily: fonts.uiBold, fontSize: 13 }}>✓</Text>}
            </View>
          </Pressable>
        )}

        <Text style={[styles.h3, { color: pal.muted }]}>TRANSLATION</Text>
        <View style={styles.grid}>
          {LANGS.map((l) => (
            <Option key={l.id} pal={pal} on={prefs.lang === l.id} title={l.native ? `${l.name}  ${l.native}` : l.name} sub={l.by} onPress={() => prefs.set({ lang: l.id })} />
          ))}
        </View>

        <Text style={[styles.h3, { color: pal.muted }]}>RECITER</Text>
        <View style={styles.grid}>
          {RECITERS.map((r) => (
            <Option key={r.id} pal={pal} on={prefs.reciter === r.id} title={r.name} sub={r.note} onPress={() => prefs.set({ reciter: r.id })} />
          ))}
        </View>
        {acct.online && (
          <>
            <Text style={[styles.h3, { color: pal.muted }]}>ACCOUNT</Text>
            <Pressable onPress={() => router.push('/feedback')} style={[styles.saved, { borderColor: pal.line }]} accessibilityRole="button">
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.savedText, { color: pal.text, fontFamily: fonts.uiSemi }]}>Send feedback</Text>
                <Text style={[styles.small, { color: pal.muted }]}>Report a problem or share an idea</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => acct.signOut()} style={[styles.saved, { borderColor: pal.line }]} accessibilityRole="button">
              <Text style={[styles.savedText, { color: pal.text, fontFamily: fonts.uiSemi }]}>Sign out</Text>
            </Pressable>
            {!confirmDelete ? (
              <Pressable onPress={() => setConfirmDelete(true)} style={styles.dangerLink} accessibilityRole="button">
                <Text style={[styles.small, { color: pal.muted, textDecorationLine: 'underline' }]}>Delete my account</Text>
              </Pressable>
            ) : (
              <View style={[styles.danger, { borderColor: '#B4432F' }]}>
                <Text style={[styles.small, { color: pal.text }]}>
                  This permanently deletes your account, progress, saved ayat, likes and reflections. It can't be undone.
                </Text>
                <View style={styles.nameRow}>
                  <Pressable onPress={() => setConfirmDelete(false)} style={[styles.save, { backgroundColor: pal.surface, borderWidth: 1, borderColor: pal.line, flex: 1, paddingVertical: 12 }]} accessibilityRole="button">
                    <Text style={[styles.saveText, { color: pal.text, textAlign: 'center' }]}>Keep it</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      try {
                        await acct.deleteAccount();
                      } catch {
                        toast("Couldn't delete — check your connection and try again");
                      }
                    }}
                    style={[styles.save, { backgroundColor: '#B4432F', flex: 1, paddingVertical: 12 }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.saveText, { color: '#FFFFFF', textAlign: 'center' }]}>Delete forever</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Bar({ pal, pct }: { pal: Palette; pct: number }) {
  return (
    <View style={[styles.bar, { backgroundColor: pal.line }]}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`, height: '100%', backgroundColor: pal.accent, borderRadius: 3 }} />
    </View>
  );
}

function Stat({ pal, n, label }: { pal: Palette; n: number; label: string }) {
  return (
    <View style={[styles.stat, { borderColor: pal.line }]}>
      <Text style={[styles.statN, { color: pal.text }]}>{n}</Text>
      <Text style={[styles.statL, { color: pal.muted }]}>{label}</Text>
    </View>
  );
}

function Option({ pal, on, title, sub, onPress }: { pal: Palette; on: boolean; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[styles.optTitle, { color: pal.text }]}>{title}</Text>
      <Text style={[styles.small, { color: pal.muted }]}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 18 },
  block: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  strong: { fontFamily: fonts.uiBold, fontSize: 16 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexBasis: '22%', flexGrow: 1, minWidth: 72, borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  statN: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statL: { fontFamily: fonts.uiSemi, fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 6 },
  saved: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  savedKey: { fontFamily: fonts.uiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  savedText: { fontFamily: fonts.read, fontSize: 15, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nameRow: { flexDirection: 'row', gap: 8 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dangerLink: { alignSelf: 'flex-start', paddingVertical: 6 },
  danger: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  input: { flex: 1, fontFamily: fonts.ui, fontSize: 15, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  save: { borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  saveText: { fontFamily: fonts.uiBold, fontSize: 15 },
  opt: { flexBasis: '47%', flexGrow: 1, borderRadius: 10, padding: 12, gap: 3 },
  optTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
});
