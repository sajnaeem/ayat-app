import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Scaled } from '@/components/Scaled';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { GATHER_SURAHS, gatheringBeats, type Beat } from '@/data/gathering';
import { useAccount } from '@/lib/account';
import { ayahAudio } from '@/lib/audio';
import { loadChapter, SURAHS, type ChapterAyah } from '@/lib/quran';
import { stopRadio } from '@/lib/radio';
import { SITE } from '@/lib/site';
import { usePrefs, type GatherPerson } from '@/lib/store';
import { fonts } from '@/lib/theme';
import { voiceLine } from '@/lib/voice';

/**
 * A gathering of dua (Saj, 15 Nov 2026). The family enters the name of someone who has passed away, puts the phone in
 * the middle of the room, and Munib leads: al-Fatihah (and a surah if chosen) recited by al-Husary, the salawat, then
 * the established duas for the deceased one by one, the Arabic recited by a human reciter and the English read aloud
 * with their name (an AI voice, disclosed), with a pause after each for everyone to say Ameen. It never replaces a
 * scholar or imam leading the dua; it is there for families who want to do it often. Data in src/data/gathering.ts.
 * The people and settings stay on the phone (prefs.gathering).
 */

const N = { bg: '#11162A', card: '#1A2038', line: 'rgba(255,255,255,0.1)', text: '#EFEBF5', muted: 'rgba(239,235,245,0.62)', gold: '#E2BE78', goldSoft: 'rgba(226,190,120,0.14)' };
const AMEEN_MS = 4500;
const clipUrl = (id: string) => `${SITE}/salah/${id}.mp3`;
const DEFAULTS = { people: [] as GatherPerson[], voice: true, fatihah: true, surah: 0 };

type Item = { uri: string; ayah?: number };

export default function Gathering() {
  const prefs = usePrefs();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const g = prefs.gathering ?? DEFAULTS;
  const save = (patch: Partial<typeof DEFAULTS>) => prefs.set({ gathering: { ...g, ...patch } });

  const [mode, setMode] = useState<'list' | 'edit' | 'prep' | 'play' | 'done'>(g.people.length ? 'list' : 'edit');
  const [editing, setEditing] = useState<GatherPerson | null>(null);
  const [who, setWho] = useState<GatherPerson | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [voices, setVoices] = useState<Map<string, string>>(new Map());
  const [prep, setPrep] = useState({ at: 0, of: 0 });

  /* ---------- Getting ready: the spoken English lines are made once and kept on the phone ---------- */
  const start = async (p: GatherPerson) => {
    const list = gatheringBeats(p.name, p.she, p.parent, g.fatihah, g.surah);
    setWho(p);
    setBeats(list);
    const map = new Map<string, string>();
    if (g.voice && acct.status === 'signedIn') {
      const lines = list.map((b) => (b.kind === 'dua' ? b.en : b.kind === 'surah' ? '' : b.say)).filter(Boolean);
      setPrep({ at: 0, of: lines.length });
      setMode('prep');
      for (let i = 0; i < lines.length; i++) {
        const r = await voiceLine(lines[i]);
        if ('error' in r) {
          toast(
            r.error === 'off'
              ? 'The English voice isn’t switched on yet, so the English will show on screen'
              : r.error === 'limit'
                ? 'That’s the voice for today. The English will show on screen'
                : 'Couldn’t make the voice just now. The English will show on screen',
          );
          map.clear();
          break;
        }
        map.set(lines[i], r.uri);
        setPrep({ at: i + 1, of: lines.length });
      }
    } else if (g.voice) {
      toast('Sign in to hear the English read aloud. For now it will show on screen');
    }
    setVoices(map);
    setMode('play');
  };

  if (mode === 'play' && who) return <Player who={who} beats={beats} voices={voices} onEnd={() => setMode('done')} onClose={() => setMode('list')} />;

  return (
    <View style={[styles.root, { backgroundColor: N.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <View style={{ width: 36 }} />
        <Text style={styles.headTitle}>A gathering of dua</Text>
        <Pressable onPress={() => router.back()} style={styles.x} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={N.text} />
        </Pressable>
      </View>

      {mode === 'prep' && (
        <View style={styles.centre}>
          <ActivityIndicator color={N.gold} size="large" />
          <Text style={styles.prepText}>Getting ready{prep.of ? ` · ${prep.at} of ${prep.of}` : ''}</Text>
          <Scaled style={styles.small}>The first time takes a moment. After that it starts straight away.</Scaled>
        </View>
      )}

      {mode === 'done' && who && (
        <View style={[styles.centre, { paddingHorizontal: 28 }]}>
          <Text style={styles.ameenBig}>آمين</Text>
          <Text style={styles.doneTitle}>Ameen</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            May Allah accept your duas for {who.name}, and gather you together again in Paradise.
          </Text>
          <Pressable onPress={() => router.push('/together')} style={[styles.ghost, { marginTop: 10 }]} accessibilityRole="button">
            <Text style={styles.ghostText}>Read the Quran together for {who.name}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('list')} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </View>
      )}

      {mode === 'edit' && (
        <Editor
          person={editing}
          onCancel={g.people.length ? () => setMode('list') : undefined}
          onSave={(p) => {
            const people = g.people.some((x) => x.id === p.id) ? g.people.map((x) => (x.id === p.id ? p : x)) : [...g.people, p];
            save({ people });
            setEditing(null);
            setMode('list');
          }}
          onDelete={
            editing
              ? () => {
                  save({ people: g.people.filter((x) => x.id !== editing.id) });
                  setEditing(null);
                  setMode(g.people.length > 1 ? 'list' : 'edit');
                }
              : undefined
          }
        />
      )}

      {mode === 'list' && (
        <ScrollView contentContainerStyle={[styles.body2, { paddingBottom: insets.bottom + 30 }]}>
          <Text style={styles.lead}>
            Put the phone in the middle of the room. Munib recites, reads each dua with their name, and waits while everyone says Ameen.
          </Text>
          {g.people.map((p) => (
            <View key={p.id} style={styles.person}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>IN LOVING MEMORY OF</Text>
                <Text style={styles.personName}>{p.name}</Text>
              </View>
              <Pressable onPress={() => { setEditing(p); setMode('edit'); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Change ${p.name}`}>
                <Icon name="pen" size={18} color={N.muted} />
              </Pressable>
              <Pressable onPress={() => start(p)} style={styles.startBtn} accessibilityRole="button" accessibilityLabel={`Begin the dua for ${p.name}`}>
                <Icon name="play" size={16} color="#1A1405" />
                <Text style={styles.startText}>Begin</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => { setEditing(null); setMode('edit'); }} style={styles.ghost} accessibilityRole="button">
            <Text style={styles.ghostText}>+ Someone else</Text>
          </Pressable>

          <Text style={styles.section}>HOW IT PLAYS</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Begin with al-Fatihah</Text>
                <Scaled style={styles.small}>Recited by Mahmoud Khalil al-Husary</Scaled>
              </View>
              <Switch value={g.fatihah} onValueChange={(v) => save({ fatihah: v })} trackColor={{ true: N.gold, false: 'rgba(255,255,255,0.24)' }} ios_backgroundColor="rgba(255,255,255,0.24)" />
            </View>
            <Text style={[styles.rowTitle, { marginTop: 6 }]}>Then a surah</Text>
            <View style={styles.chips}>
              {GATHER_SURAHS.map((s) => {
                const on = g.surah === s.s;
                return (
                  <Pressable key={s.s} onPress={() => save({ surah: s.s })} style={[styles.chip, on && { backgroundColor: N.gold, borderColor: N.gold }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.chipText, on && { color: '#1A1405' }]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Scaled style={styles.small}>{GATHER_SURAHS.find((s) => s.s === g.surah)?.note}</Scaled>
            <View style={[styles.switchRow, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Read the English aloud, with their name</Text>
                <Scaled style={styles.small}>
                  An AI voice (ElevenLabs) reads the English; to make it, their name is sent to ElevenLabs and nothing is kept by Munib. The Arabic is always a human reciter.{acct.status !== 'signedIn' ? ' Needs you to be signed in.' : ''}
                </Scaled>
              </View>
              <Switch value={g.voice} onValueChange={(v) => save({ voice: v })} trackColor={{ true: N.gold, false: 'rgba(255,255,255,0.24)' }} ios_backgroundColor="rgba(255,255,255,0.24)" />
            </View>
          </View>

          <Text style={styles.section}>GOOD TO KNOW</Text>
          <View style={styles.card}>
            <Scaled style={styles.small}>
              The duas are the ones the Prophet ﷺ taught for those who have passed, from Hisn al-Muslim, and duas from the Quran. Making dua for them is something all scholars agree on. Scholars differ on whether the reward of reciting the Quran reaches the one who has passed; ask your imam if you’re unsure.
            </Scaled>
            <Scaled style={styles.small}>
              This doesn’t replace a scholar or imam leading the dua. It is here for the days you’d like to do it together at home. There are no special days: any day is a good day to make dua for them.
            </Scaled>
            <Scaled style={styles.small}>The Arabic of these duas is said for a man; for a woman the words change, and Munib shows those words (there’s no recording of them yet, so the English is read aloud).</Scaled>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ---------- Adding or changing someone ---------- */
function Editor({ person, onSave, onCancel, onDelete }: { person: GatherPerson | null; onSave: (p: GatherPerson) => void; onCancel?: () => void; onDelete?: () => void }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(person?.name ?? '');
  const [she, setShe] = useState(person?.she ?? false);
  const [parent, setParent] = useState(person?.parent ?? false);
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
  return (
    <ScrollView contentContainerStyle={[styles.body2, { paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
      {!person && (
        <Text style={styles.lead}>
          Make dua together for someone who has passed away. Munib leads, the way an imam would at home, and pauses for everyone to say Ameen.
        </Text>
      )}
      <Text style={styles.section}>WHO ARE WE MAKING DUA FOR?</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Their name, e.g. Naeem or Dad" placeholderTextColor={N.muted} style={styles.input} maxLength={40} autoCapitalize="words" returnKeyType="done" />
      <View style={styles.chips}>
        {[
          { v: false, l: 'He' },
          { v: true, l: 'She' },
        ].map((o) => (
          <Pressable key={o.l} onPress={() => setShe(o.v)} style={[styles.chip, styles.bigChip, she === o.v && { backgroundColor: N.gold, borderColor: N.gold }]} accessibilityRole="button" accessibilityState={{ selected: she === o.v }}>
            <Text style={[styles.chipText, she === o.v && { color: '#1A1405' }]}>{o.l}</Text>
          </Pressable>
        ))}
      </View>
      <Scaled style={styles.small}>The Arabic of the duas changes for a man or a woman.</Scaled>
      <View style={[styles.card, styles.switchRow]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>My mother or father</Text>
          <Scaled style={styles.small}>Adds the Quran’s duas for parents (17:24 and 14:41)</Scaled>
        </View>
        <Switch value={parent} onValueChange={setParent} trackColor={{ true: N.gold, false: 'rgba(255,255,255,0.24)' }} ios_backgroundColor="rgba(255,255,255,0.24)" />
      </View>
      <Pressable
        onPress={() => clean.length >= 2 && onSave({ id: person?.id ?? String(Date.now()), name: clean, she, parent })}
        style={[styles.primary, { opacity: clean.length >= 2 ? 1 : 0.5 }]}
        disabled={clean.length < 2}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>{person ? 'Save' : 'Continue'}</Text>
      </Pressable>
      {onCancel && (
        <Pressable onPress={onCancel} style={styles.ghost} accessibilityRole="button">
          <Text style={styles.ghostText}>Cancel</Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable onPress={onDelete} style={{ alignSelf: 'center', padding: 10 }} accessibilityRole="button">
          <Scaled style={[styles.small, { textDecorationLine: 'underline' }]}>Remove {person?.name}</Scaled>
        </Pressable>
      )}
      <Scaled style={[styles.small, { textAlign: 'center' }]}>Kept only on this phone.</Scaled>
    </ScrollView>
  );
}

/* ---------- The gathering itself ---------- */
function Player({ who, beats, voices, onEnd, onClose }: { who: GatherPerson; beats: Beat[]; voices: Map<string, string>; onEnd: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'say' | 'ameen' | 'you'>('say');
  const [paused, setPaused] = useState(false);
  const [ayah, setAyah] = useState<number | null>(null);
  const [showTl, setShowTl] = useState(!!prefs.showTl);
  const [text, setText] = useState<ChapterAyah[] | null>(null);
  const player = useAudioPlayer(null, { updateInterval: 300 });
  const status = useAudioPlayerStatus(player);
  const q = useRef<{ items: Item[]; at: number; token: number }>({ items: [], at: 0, token: 0 });
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beat = beats[i];
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const clearHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };
  const next = () => {
    clearHold();
    try { player.pause(); } catch {}
    if (i + 1 >= beats.length) return onEnd();
    setI(i + 1);
  };
  const back = () => {
    clearHold();
    setI(Math.max(0, i - 1));
  };

  // What has been said for this beat: wait for Ameen, a moment, or for the family to read it themselves.
  const after = () => {
    setAyah(null);
    clearHold();
    if (beat.kind === 'dua') {
      if (!q.current.items.length) return setPhase('you');
      if (beat.dua.id === 'salawat') return (hold.current = setTimeout(next, 1500));
      setPhase('ameen');
      hold.current = setTimeout(next, AMEEN_MS);
      return;
    }
    hold.current = setTimeout(next, beat.kind === 'surah' ? 1500 : q.current.items.length ? 1200 : 5000);
  };
  const play = () => {
    const it = q.current.items[q.current.at];
    if (!it) return after();
    setAyah(it.ayah ?? null);
    player.replace({ uri: it.uri });
    player.play();
  };

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});
    activateKeepAwakeAsync('gathering').catch(() => {});
    stopRadio();
    return () => {
      clearHold();
      deactivateKeepAwake('gathering').catch?.(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each beat: build what it plays, then play it.
  useEffect(() => {
    const token = ++q.current.token;
    clearHold();
    setPhase('say');
    setPaused(false);
    setAyah(null);
    scroller.current?.scrollTo({ y: 0, animated: false });
    (async () => {
      const items: Item[] = [];
      if (beat.kind === 'surah') {
        setText(null);
        loadChapter(beat.s, 'en').then((t) => q.current.token === token && setText(t)).catch(() => {});
        const count = SURAHS[beat.s - 1][3];
        for (let n = 1; n <= count; n++) {
          try {
            items.push({ uri: (await ayahAudio('husary', beat.s, n)).url, ayah: n });
          } catch {}
          if (q.current.token !== token) return;
        }
      } else if (beat.kind === 'dua') {
        if (beat.clip) items.push({ uri: clipUrl(beat.clip) });
        if (beat.dua.quran) {
          try {
            items.push({ uri: (await ayahAudio('husary', beat.dua.quran.s, beat.dua.quran.a)).url });
          } catch {}
        }
        const v = voices.get(beat.en);
        if (v) items.push({ uri: v });
      } else {
        const v = voices.get(beat.say);
        if (v) items.push({ uri: v });
      }
      if (q.current.token !== token) return;
      q.current = { items, at: 0, token };
      play();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    if (!status.didJustFinish || paused) return;
    q.current.at += 1;
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      if (phase === 'ameen') hold.current = setTimeout(next, 2000);
      else if (q.current.items[q.current.at]) player.play();
      else after();
    } else {
      setPaused(true);
      clearHold();
      try { player.pause(); } catch {}
    }
  };

  const total = beats.length;
  const surahAyah = beat.kind === 'surah' && text && ayah ? text[ayah - 1] : null;

  return (
    <View style={[styles.root, { backgroundColor: N.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={onClose} style={styles.x} accessibilityRole="button" accessibilityLabel="Stop" hitSlop={8}>
          <Icon name="close" size={18} color={N.text} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.eyebrow}>FOR {who.name.toUpperCase()}</Text>
          <View style={styles.dots}>
            {beats.map((_, n) => (
              <View key={n} style={[styles.dot, { backgroundColor: n <= i ? N.gold : 'rgba(255,255,255,0.18)', width: n === i ? 14 : 6 }]} />
            ))}
          </View>
        </View>
        <Pressable onPress={() => setShowTl((x) => !x)} style={[styles.x, showTl && { backgroundColor: N.goldSoft, borderColor: N.gold }]} accessibilityRole="button" accessibilityLabel="Transliteration" hitSlop={8}>
          <Text style={[styles.aa, { color: showTl ? N.gold : N.text }]}>Aa</Text>
        </Pressable>
      </View>

      <ScrollView ref={scroller} contentContainerStyle={[styles.stage, { paddingBottom: insets.bottom + 120 }]}>
        {beat.kind === 'intro' && (
          <View style={styles.centreBlock}>
            <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
            <Text style={styles.bigEn}>{beat.say}</Text>
          </View>
        )}
        {beat.kind === 'surah' && (
          <View style={styles.centreBlock}>
            <Text style={styles.eyebrow}>SURAH {SURAHS[beat.s - 1][0].toUpperCase()}</Text>
            <Text style={styles.surahAr}>{SURAHS[beat.s - 1][1]}</Text>
            {surahAyah ? (
              <>
                <Text style={styles.ayahAr}>{surahAyah.ar}</Text>
                {showTl && !!surahAyah.tl && <Text style={styles.tl}>{surahAyah.tl}</Text>}
                <Text style={styles.ayahEn}>{surahAyah.tr}</Text>
                <Scaled style={styles.small}>Ayah {ayah} of {SURAHS[beat.s - 1][3]}</Scaled>
              </>
            ) : (
              <ActivityIndicator color={N.gold} style={{ marginTop: 20 }} />
            )}
          </View>
        )}
        {beat.kind === 'dua' && (
          <View style={{ gap: 14 }}>
            <Text style={[styles.eyebrow, { textAlign: 'center' }]}>{beat.dua.title.toUpperCase()}</Text>
            <Text style={[styles.duaAr, beat.ar.length > 300 && { fontSize: 23, lineHeight: 46 }]}>{beat.ar}</Text>
            {showTl && <Text style={styles.tl}>{beat.tl}</Text>}
            <Text style={[styles.duaEn, beat.en.length > 380 && { fontSize: 17, lineHeight: 26 }]}>{beat.en}</Text>
            <Scaled style={[styles.small, { textAlign: 'center' }]}>{beat.dua.src}</Scaled>
          </View>
        )}
        {beat.kind === 'close' && (
          <View style={styles.centreBlock}>
            <Text style={styles.bigEn}>{beat.say}</Text>
          </View>
        )}
      </ScrollView>

      {phase === 'ameen' && (
        <View style={styles.ameen} pointerEvents="none">
          <Text style={styles.ameenBig}>آمين</Text>
          <Text style={styles.ameenEn}>Everyone: Ameen</Text>
        </View>
      )}

      <View style={[styles.bar, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={back} disabled={i === 0} style={[styles.round, { opacity: i === 0 ? 0.35 : 1 }]} accessibilityRole="button" accessibilityLabel="Back">
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={20} color={N.text} />
          </View>
        </Pressable>
        {phase === 'you' ? (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Scaled style={[styles.small, { textAlign: 'center' }]}>One of you reads this aloud, then everyone says Ameen</Scaled>
          </View>
        ) : (
          <Pressable onPress={togglePause} style={styles.playBtn} accessibilityRole="button" accessibilityLabel={paused ? 'Carry on' : 'Pause'}>
            <Icon name={paused ? 'play' : 'pause'} size={22} color="#1A1405" />
          </Pressable>
        )}
        <Pressable onPress={next} style={[styles.round, phase === 'you' && { backgroundColor: N.gold, borderColor: N.gold }]} accessibilityRole="button" accessibilityLabel={i + 1 >= total ? 'Finish' : 'Next'}>
          <Icon name="chevron" size={20} color={phase === 'you' ? '#1A1405' : N.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  headTitle: { fontFamily: fonts.read, fontSize: 20, color: N.text },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: N.line, alignItems: 'center', justifyContent: 'center' },
  aa: { fontFamily: fonts.uiBold, fontSize: 13 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  prepText: { fontFamily: fonts.uiSemi, fontSize: 17, color: N.text },
  body2: { padding: 18, gap: 12 },
  lead: { fontFamily: fonts.read, fontSize: 16.5, lineHeight: 25, color: N.text },
  body: { fontFamily: fonts.read, fontSize: 17, lineHeight: 26, color: N.text },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: N.muted },
  section: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.2, color: N.gold, marginTop: 10 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.4, color: N.gold },
  person: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: N.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(226,190,120,0.28)' },
  personName: { fontFamily: fonts.read, fontSize: 24, color: N.text, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: N.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  startText: { fontFamily: fonts.uiBold, fontSize: 15, color: '#1A1405' },
  card: { backgroundColor: N.card, borderRadius: 18, padding: 14, gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5, color: N.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: N.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  bigChip: { paddingHorizontal: 26, paddingVertical: 11 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14, color: N.text },
  input: { backgroundColor: N.card, borderRadius: 14, borderWidth: 1, borderColor: N.line, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.read, fontSize: 20, color: N.text },
  primary: { backgroundColor: N.gold, borderRadius: 999, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 8 },
  primaryText: { fontFamily: fonts.uiBold, fontSize: 16, color: '#1A1405' },
  ghost: { borderWidth: 1, borderColor: N.line, borderRadius: 999, paddingVertical: 13, alignItems: 'center', alignSelf: 'stretch' },
  ghostText: { fontFamily: fonts.uiSemi, fontSize: 15, color: N.text },
  doneTitle: { fontFamily: fonts.read, fontSize: 30, color: N.text },
  dots: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },
  stage: { paddingHorizontal: 22, paddingTop: 20, flexGrow: 1, justifyContent: 'center' },
  centreBlock: { alignItems: 'center', gap: 18 },
  bismillah: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 56, color: N.gold, textAlign: 'center' },
  bigEn: { fontFamily: fonts.read, fontSize: 24, lineHeight: 34, color: N.text, textAlign: 'center' },
  surahAr: { fontFamily: fonts.arabic, fontSize: 40, lineHeight: 70, color: N.gold },
  ayahAr: { fontFamily: fonts.arabic, fontSize: 28, lineHeight: 54, color: N.text, textAlign: 'center', writingDirection: 'rtl' },
  ayahEn: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24, color: N.muted, textAlign: 'center' },
  tl: { fontFamily: fonts.readItalic, fontSize: 16, lineHeight: 24, color: N.gold, textAlign: 'center' },
  duaAr: { fontFamily: fonts.arabic, fontSize: 27, lineHeight: 52, color: N.text, textAlign: 'center', writingDirection: 'rtl' },
  duaEn: { fontFamily: fonts.read, fontSize: 19, lineHeight: 29, color: N.text, textAlign: 'center' },
  ameen: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,22,42,0.88)' },
  ameenBig: { fontFamily: fonts.arabic, fontSize: 64, lineHeight: 110, color: N.gold },
  ameenEn: { fontFamily: fonts.read, fontSize: 22, color: N.text },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingHorizontal: 24, paddingTop: 14, backgroundColor: N.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: N.line },
  round: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: N.line, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: N.gold, alignItems: 'center', justifyContent: 'center' },
});
