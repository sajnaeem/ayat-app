import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { PostViewer } from '@/components/PostViewer';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { fold } from '@/lib/fold';
import { Post } from '@/lib/posts';
import { follow, PersonHit, searchPeople, searchPosts } from '@/lib/profiles';
import { MOODS, MoodId, SURAHS, VERSES } from '@/lib/quran';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

type Tab = 'all' | 'quran' | 'people' | 'posts';
const POPULAR = [18, 36, 67, 55, 56, 1, 112];

/**
 * Search, like TikTok or Instagram: surahs and ayat, feelings, people and community posts in one place.
 * Surahs, ayat and feelings are searched on the phone (no account needed); people and posts need an account.
 */
export default function Search() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const acct = useAccount();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [people, setPeople] = useState<PersonHit[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const online = !!acct.userId;
  const t = q.trim();

  // People and posts: wait until typing pauses, and ignore answers to older searches.
  const seq = useRef(0);
  useEffect(() => {
    if (!online || t.length < 2) {
      setPeople(null);
      setPosts(null);
      return;
    }
    const n = ++seq.current;
    setPeople(null);
    setPosts(null);
    const timer = setTimeout(() => {
      searchPeople(t).then((r) => n === seq.current && setPeople(r), () => n === seq.current && setPeople([]));
      searchPosts(t).then((r) => n === seq.current && setPosts(r), () => n === seq.current && setPosts([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [t, online]);

  // On the phone: surahs by name, meaning or number; a reference like 2:255; feelings; Munib's chosen ayat by their words.
  const local = useMemo(() => {
    if (!t) return { surahs: [], ref: null, moods: [], ayat: [] };
    const f = fold(t);
    const all = SURAHS.map((x, i) => ({ s: i + 1, name: x[0], ar: x[1], meaning: x[2], count: x[3] }));
    const surahs = /^\d+$/.test(t) ? all.filter((x) => String(x.s) === t || (t.length > 1 && String(x.s).startsWith(t))) : f.length >= 2 ? all.filter((x) => fold(x.name).includes(f) || fold(x.meaning).includes(f) || x.ar.includes(t)) : [];
    const m = t.match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})$/);
    const ref = m && Number(m[1]) >= 1 && Number(m[1]) <= 114 && Number(m[2]) >= 1 && Number(m[2]) <= SURAHS[Number(m[1]) - 1][3] ? { s: Number(m[1]), a: Number(m[2]) } : null;
    const lower = t.toLowerCase();
    const moods = lower.length >= 3 ? MOODS.filter((x) => x.label.toLowerCase().includes(lower) || x.sub.toLowerCase().includes(lower) || x.id.includes(lower)) : [];
    const ayat =
      lower.length >= 3
        ? VERSES.filter((v) => {
            const text = [...(v.tr[prefs.lang] ?? []), ...(prefs.lang === 'en' ? [] : v.tr.en ?? [])].join(' ').toLowerCase();
            return text.includes(lower) || v.note.toLowerCase().includes(lower);
          }).slice(0, 20)
        : [];
    return { surahs: surahs.slice(0, 12), ref, moods, ayat };
  }, [t, prefs.lang]);

  const openAt = (s: number, a: number) => {
    prefs.readAt(s, a);
    router.dismissAll();
  };
  const pickMood = (id: MoodId) => {
    prefs.set({ mood: id, feedMode: 'foryou' });
    router.dismissAll();
  };
  const toggleFollow = async (p: PersonHit) => {
    if (!acct.userId) return;
    const on = !p.i_follow;
    setPeople((l) => l?.map((x) => (x.id === p.id ? { ...x, i_follow: on, followers: x.followers + (on ? 1 : -1) } : x)) ?? null);
    try {
      await follow(acct.userId, p.id, on);
    } catch {
      setPeople((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? null);
      toast("Couldn't update. Try again");
    }
  };

  const quranCount = local.surahs.length + local.moods.length + local.ayat.length + (local.ref ? 1 : 0);
  const show = (x: Tab) => tab === 'all' || tab === x;
  const cap = (n: number) => (tab === 'all' ? n : 999);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.box, { backgroundColor: pal.surface }]}>
          <Icon name="search" size={18} color={pal.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search surahs, ayat, people, posts"
            placeholderTextColor={pal.muted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[styles.input, { color: pal.text }]}
            accessibilityLabel="Search"
          />
          {!!q && (
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Icon name="close" size={15} color={pal.muted} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.cancel, { color: pal.text }]}>Cancel</Text>
        </Pressable>
      </View>

      {!!t && (
        <View style={styles.tabs}>
          {(
            [
              ['all', 'Top'],
              ['quran', 'Quran'],
              ['people', 'People'],
              ['posts', 'Posts'],
            ] as const
          ).map(([id, label]) => (
            <Pressable key={id} onPress={() => setTab(id)} style={[styles.tab, { backgroundColor: tab === id ? pal.text : pal.surface }]} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}>
              <Text style={[styles.tabText, { color: tab === id ? pal.bg : pal.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 10 }}>
        {!t ? (
          <>
            <Label pal={pal} text="Popular surahs" />
            <View style={styles.chips}>
              {POPULAR.map((s) => (
                <Pressable key={s} onPress={() => openAt(s, 1)} style={[styles.chip, { backgroundColor: pal.surface }]} accessibilityRole="button">
                  <Text style={[styles.chipText, { color: pal.text }]}>{SURAHS[s - 1][0]}</Text>
                </Pressable>
              ))}
            </View>
            <Row pal={pal} icon="book" title="All 114 surahs" sub="Browse the whole Quran" onPress={() => router.push('/read')} />
            <Label pal={pal} text="Try searching" />
            <Text style={[styles.hint, { color: pal.muted }]}>A surah ("Mulk", "36"), an ayah ("2:255"), a feeling ("anxious"), words from an ayah ("patience"), or someone's name.</Text>
          </>
        ) : (
          <>
            {show('quran') && quranCount > 0 && (
              <>
                {tab === 'all' && <Label pal={pal} text="Quran" />}
                {local.ref && (
                  <Row pal={pal} icon="book" title={`${SURAHS[local.ref.s - 1][0]} ${local.ref.s}:${local.ref.a}`} sub="Open this ayah" onPress={() => openAt(local.ref!.s, local.ref!.a)} />
                )}
                {local.surahs.slice(0, cap(4)).map((x) => (
                  <Row key={x.s} pal={pal} num={x.s} title={x.name} sub={`${x.meaning} · ${x.count} ayat`} right={x.ar} onPress={() => openAt(x.s, 1)} />
                ))}
                {local.moods.slice(0, cap(3)).map((m) => (
                  <Row key={m.id} pal={pal} icon="heart" title={m.when} sub="Ayat picked for this, in For you" onPress={() => pickMood(m.id)} />
                ))}
                {local.ayat.slice(0, cap(4)).map((v) => (
                  <Pressable key={v.k} onPress={() => openAt(v.s, v.a)} style={[styles.card, { backgroundColor: pal.surface }]} accessibilityRole="button">
                    <Text style={[styles.key, { color: pal.accent }]}>
                      {v.name} {v.k.replace('-', '–')}
                    </Text>
                    <Highlight pal={pal} text={(v.tr[prefs.lang] ?? v.tr.en ?? []).join(' ')} q={t} lines={3} />
                  </Pressable>
                ))}
              </>
            )}

            {show('people') && (
              <>
                {tab === 'all' && (people?.length || !online) ? <Label pal={pal} text="People" /> : null}
                {!online ? (
                  tab !== 'quran' && (
                    <Row pal={pal} icon="user" title="Sign in to find people and posts" sub="Free account" onPress={() => router.push({ pathname: '/signin', params: { why: 'profile' } })} />
                  )
                ) : people === null ? (
                  tab === 'people' && <ActivityIndicator color={pal.accent} style={{ marginTop: 16 }} />
                ) : (
                  people.slice(0, cap(4)).map((p) => (
                    <View key={p.id} style={[styles.person, { backgroundColor: pal.surface }]}>
                      <Pressable onPress={() => router.push(`/profile/${p.id}`)} style={styles.personMain} accessibilityRole="button">
                        <Avatar id={p.id} name={p.handle} size={42} />
                        <View style={{ flex: 1, gap: 1 }}>
                          <Text style={[styles.rowTitle, { color: pal.text }]}>{p.handle}</Text>
                          <Text style={[styles.sub, { color: pal.muted }]} numberOfLines={1}>
                            {p.followers} {p.followers === 1 ? 'follower' : 'followers'}
                            {p.bio ? ` · ${p.bio}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={() => toggleFollow(p)} style={[styles.follow, { backgroundColor: p.i_follow ? pal.bg : pal.accent }]} accessibilityRole="button">
                        <Text style={[styles.followText, { color: p.i_follow ? pal.text : pal.onAccent }]}>{p.i_follow ? 'Following' : 'Follow'}</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </>
            )}

            {show('posts') && online && (
              <>
                {tab === 'all' && !!posts?.length && <Label pal={pal} text="Posts" />}
                {posts === null
                  ? tab === 'posts' && <ActivityIndicator color={pal.accent} style={{ marginTop: 16 }} />
                  : posts.slice(0, cap(4)).map((p, i) => (
                      <Pressable key={p.id} onPress={() => setOpen(i)} style={[styles.card, { backgroundColor: pal.surface }]} accessibilityRole="button">
                        <View style={styles.postHead}>
                          <Avatar id={p.user_id} name={p.handle} size={24} />
                          <Text style={[styles.postBy, { color: pal.text }]}>{p.handle}</Text>
                          {p.kind !== 'text' && <Text style={[styles.sub, { color: pal.muted }]}>{p.kind === 'image' ? 'Photo' : 'Video'}</Text>}
                        </View>
                        <Highlight pal={pal} text={p.body} q={t} lines={4} />
                        {!!p.source && <Text style={[styles.sub, { color: pal.muted }]}>{p.source}</Text>}
                      </Pressable>
                    ))}
              </>
            )}

            {(() => {
              const waiting = online && (people === null || posts === null) && t.length >= 2;
              const shown = (show('quran') ? quranCount : 0) + (show('people') ? people?.length ?? 0 : 0) + (show('posts') ? posts?.length ?? 0 : 0);
              if (waiting && tab === 'all') return <ActivityIndicator color={pal.accent} style={{ marginTop: 16 }} />;
              if (!waiting && shown === 0 && (online || tab === 'quran' || tab === 'all'))
                return <Text style={[styles.hint, { color: pal.muted, textAlign: 'center', marginTop: 24 }]}>Nothing found for “{t}”.</Text>;
              return null;
            })()}
          </>
        )}
      </ScrollView>

      {posts && (
        <PostViewer
          posts={posts}
          start={open}
          mine={false}
          onClose={() => setOpen(null)}
          onAuthor={(p) => {
            setOpen(null);
            router.push(`/profile/${p.user_id}`);
          }}
        />
      )}
    </View>
  );
}

function Label({ pal, text }: { pal: Palette; text: string }) {
  return <Text style={[styles.label, { color: pal.text }]}>{text}</Text>;
}

function Row({ pal, icon, num, title, sub, right, onPress }: { pal: Palette; icon?: 'book' | 'heart' | 'user'; num?: number; title: string; sub?: string; right?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: pal.surface, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
      <View style={[styles.icon, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.22 : 0.12) }]}>
        {icon ? <Icon name={icon} size={17} color={pal.accent} /> : <Text style={[styles.num, { color: pal.accent }]}>{num}</Text>}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[styles.rowTitle, { color: pal.text }]}>{title}</Text>
        {!!sub && <Text style={[styles.sub, { color: pal.muted }]}>{sub}</Text>}
      </View>
      {right ? <Text style={[styles.ar, { color: pal.text }]}>{right}</Text> : <Icon name="chevron" size={15} color={pal.muted} />}
    </Pressable>
  );
}

/** The matching words in bold, with a little text either side. */
function Highlight({ pal, text, q, lines }: { pal: Palette; text: string; q: string; lines: number }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0)
    return (
      <Text style={[styles.body, { color: pal.text }]} numberOfLines={lines}>
        {text}
      </Text>
    );
  const start = Math.max(0, i - 60);
  return (
    <Text style={[styles.body, { color: pal.text }]} numberOfLines={lines}>
      {start > 0 ? '…' : ''}
      {text.slice(start, i)}
      <Text style={{ fontFamily: fonts.uiBold, color: pal.accent }}>{text.slice(i, i + q.length)}</Text>
      {text.slice(i + q.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, fontFamily: fonts.ui, fontSize: 16, paddingVertical: 11 },
  cancel: { fontFamily: fonts.uiSemi, fontSize: 15 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  tab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  tabText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  label: { fontFamily: fonts.uiBold, fontSize: 17, marginTop: 10, letterSpacing: -0.2 },
  hint: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: fonts.uiBold, fontSize: 13 },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  sub: { fontFamily: fonts.ui, fontSize: 13 },
  ar: { fontFamily: fonts.arabic, fontSize: 19 },
  card: { borderRadius: 14, padding: 14, gap: 6 },
  key: { fontFamily: fonts.uiBold, fontSize: 13 },
  body: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  personMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  follow: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
  followText: { fontFamily: fonts.uiBold, fontSize: 13 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postBy: { fontFamily: fonts.uiSemi, fontSize: 14, flex: 1 },
});
