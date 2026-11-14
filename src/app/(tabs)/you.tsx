import { useFocusEffect, useRouter } from 'expo-router';
import { showFeed } from '@/lib/nav';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuidelinesSheet } from '@/components/Guidelines';
import { Icon } from '@/components/Icon';
import { Bar, Choice, DANGER, Group, Row, Section, speedLabel, Stat } from '@/components/List';
import { Sheet } from '@/components/Sheet';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { RECITERS } from '@/lib/audio';
import { dayKey, surahDone, useProgress } from '@/lib/progress';
import { LANGS, SURAHS, VERSES } from '@/lib/quran';
import { askPermission, REMINDER_TIMES } from '@/lib/reminders';
import { AUTO_PACES } from '@/components/ReadingSheet';
import { FeedTopicsSheet } from '@/components/FeedTopicsSheet';
import { feedSummary } from '@/lib/feedTopics';
import { usePlus } from '@/lib/plus';
import { ART } from '@/lib/art';
import { SPEEDS, TEXT_SIZES, textScale, usePrefs } from '@/lib/store';
import { profileCard, Profile } from '@/lib/profiles';
import { amReviewer, deletePost, myPosts, Post, reviewQueue } from '@/lib/posts';
import { fonts, mix, Palette, usePalette, onColour } from '@/lib/theme';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/** Juz' ʿAmma: surahs 78–114, 564 ayat. */
const JUZ_AMMA_FIRST = 78;
const JUZ_AMMA_AYAT = 564;

export default function You() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const { progress } = useProgress();
  const plus = usePlus();
  const hp = onColour(pal, pal.pop.sky);
  const acct = useAccount();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [pick, setPick] = useState<'reminder' | 'lang' | 'reciter' | 'speed' | 'size' | 'auto' | 'topics' | 'look' | null>(null);
  const [blocked, setBlocked] = useState<{ id: string; handle: string }[] | null>(null);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const openBlocked = () => {
    setBlocked([]);
    setBlockedLoading(true);
    acct.listBlocked().then(setBlocked, () => {
      setBlocked(null);
      toast("Couldn't load. Check your connection and try again");
    }).finally(() => setBlockedLoading(false));
  };
  // Your posts and their review status; for reviewers, how many posts are waiting.
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!acct.userId) return;
      myPosts(acct.userId).then(setPosts, () => setPosts([]));
      profileCard(acct.userId).then(setMe, () => {});
      amReviewer(acct.userId).then((yes) => (yes ? reviewQueue().then((q) => setWaiting(q.length)) : setWaiting(null)));
    }, [acct.userId]),
  );
  const removePost = async (p: Post) => {
    try {
      await deletePost(p);
      setPosts((l) => l?.filter((x) => x.id !== p.id) ?? null);
      toast('Post deleted');
    } catch {
      toast("Couldn't delete. Try again");
    }
  };

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
    prefs.readAt(Number(s), Number(ab.split('-')[0]));
    showFeed(router);
  };

  const reminderLabel = !prefs.reminders.on ? 'Off' : REMINDER_TIMES.find((t) => t.hour === prefs.reminders.hour && t.minute === prefs.reminders.minute)?.sub ?? 'On';
  const lang = LANGS.find((l) => l.id === prefs.lang) ?? LANGS[0];
  const reciter = RECITERS.find((r) => r.id === prefs.reciter) ?? RECITERS[0];
  const version = `Munib ${Constants.expoConfig?.version ?? ''}${Updates.createdAt ? ` · updated ${Updates.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}`;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: pal.text }]}>You</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 30 }]}>
        {acct.status !== 'signedIn' && (
          <Pressable
            onPress={() => router.push({ pathname: '/signin', params: { why: 'you' } })}
            style={({ pressed }) => [styles.card, styles.pad, { backgroundColor: pal.surface, opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.eyebrow, { color: pal.accent }]}>MAKE MUNIB YOURS</Text>
            <Text style={[styles.rowTitle, { color: pal.text }]}>Sign in to keep your progress safe, reflect with others and read together.</Text>
            <Text style={[styles.sub, { color: pal.accent, fontFamily: fonts.uiBold }]}>Sign in or create a free account</Text>
          </Pressable>
        )}
        {acct.online && !!acct.userId && (
          <Pressable onPress={() => router.push(`/profile/${acct.userId}`)} style={({ pressed }) => [styles.card, styles.me, { backgroundColor: pal.surface, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
            <Avatar id={acct.userId} name={acct.handle ?? '?'} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.big, { color: pal.text, marginTop: 0, fontSize: 20 }]}>{acct.handle ?? 'Your profile'}</Text>
              <Text style={[styles.sub, { color: pal.muted }]}>{me ? `${me.followers} ${me.followers === 1 ? 'follower' : 'followers'} · ${me.following} following · ${me.posts} ${me.posts === 1 ? 'post' : 'posts'}` : 'View your profile'}</Text>
            </View>
            <Icon name="chevron" size={18} color={pal.muted} />
          </Pressable>
        )}
        {/* Progress */}
        <View style={[styles.card, styles.pad, { backgroundColor: hp.surface }]}>
          <Text style={[styles.eyebrow, { color: hp.accent }]}>YOUR READING</Text>
          <Text style={[styles.big, { color: hp.text }]}>
            {total.toLocaleString('en-GB')} <Text style={[styles.sub, { color: hp.muted }]}>of 6,236 ayat</Text>
          </Text>
          <Bar pal={hp} pct={Math.min(1, total / 6236)} />
          {prefs.dailyGoal > 0 && (
            <Text style={[styles.sub, { color: hp.muted, marginTop: 8 }]}>
              Today: {Math.min(progress.days[dayKey()] ?? 0, 9999)} of your {prefs.dailyGoal} ayat{(progress.days[dayKey()] ?? 0) >= prefs.dailyGoal ? '  ·  done, alhamdulillah' : ''}
            </Text>
          )}
          <View style={[styles.stats, { borderTopColor: hp.line }]}>
            <Stat pal={hp} n={week} label="This week" />
            <Stat pal={hp} n={total} label="Ayat read" />
            <Stat pal={hp} n={done.length} label="Surahs" />
            <Stat pal={hp} n={Object.keys(progress.mem).length} label="Memorised" />
          </View>
        </View>
        <View style={[styles.card, styles.pad, { backgroundColor: pal.surface }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.rowTitle, { color: pal.text }]}>Juz' ʿAmma</Text>
            <Text style={[styles.sub, { color: pal.muted }]}>
              {juz} of {JUZ_AMMA_AYAT} ayat
            </Text>
          </View>
          <Bar pal={pal} pct={juz / JUZ_AMMA_AYAT} />
          {done.length > 0 && (
            <View style={styles.chips}>
              {done.map((s) => (
                <Pressable key={s} onPress={() => openKey(`${s}:1`)} style={[styles.chip, { backgroundColor: pal.bg }]} accessibilityRole="button">
                  <Text style={[styles.chipText, { color: pal.text }]}>{SURAHS[s - 1][0]}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Saved */}
        <Section pal={pal} title="Saved ayat" note={saves.length ? `${saves.length}` : undefined} />
        <Group pal={pal}>
          {saves.length === 0 ? (
            <View style={styles.pad}>
              <Text style={[styles.sub, { color: pal.muted }]}>Tap the bookmark on any ayah to keep it here.</Text>
            </View>
          ) : (
            saves.map(([k], i) => {
              const v = VERSES.find((x) => x.k === k);
              const [s] = k.split(':');
              const preview = v ? (v.tr[prefs.lang] ?? v.tr.en ?? []).join(' ') : `${SURAHS[Number(s) - 1][0]}`;
              return (
                <Pressable key={k} onPress={() => openKey(k)} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }]} accessibilityRole="button">
                  <Text style={[styles.key, { color: pal.accent }]}>{k.replace('-', '–')}</Text>
                  <Text style={[styles.preview, { color: pal.text }]} numberOfLines={1}>
                    {preview}
                  </Text>
                  <Icon name="chevron" size={16} color={pal.muted} />
                </Pressable>
              );
            })
          )}
        </Group>

        {/* Reading settings */}
        <Pressable onPress={() => router.push('/plus')} accessibilityRole="button" style={({ pressed }) => [styles.plusCard, { backgroundColor: pal.pop.violet, opacity: pressed ? 0.88 : 1 }]}>
          <Image source={ART.star8} style={styles.plusArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.plusEyebrow}>MUNIB PLUS</Text>
          <Text style={styles.plusTitle}>{plus.active ? 'You’re a member. JazakAllahu khayran.' : 'Unlimited Ask, listen offline, every story'}</Text>
          <Text style={styles.plusSub}>{plus.active ? (plus.lifetime ? 'Lifetime' : 'Manage your membership') : 'And you keep Munib free for everyone'}</Text>
        </Pressable>

        <Section pal={pal} title="Learn" />
        <Group pal={pal}>
          <Row pal={pal} icon="sliders" title="Your journey" sub={prefs.journey ? 'Retake the questions to reshape Munib' : 'Five questions so Munib fits where you are'} onPress={() => router.push('/journey')} />
          <Row pal={pal} icon="info" title="Words and practices explained" sub="Dhikr, dua, salah, the Qibla and more, in plain English" onPress={() => router.push('/explain')} divider />
        </Group>

        <Section pal={pal} title="Reading" />
        <Group pal={pal}>
          <Row pal={pal} icon="bell" title="Daily reminder" value={reminderLabel} onPress={() => setPick('reminder')} />
          <Row pal={pal} icon="globe" title="Translation" value={lang.name} onPress={() => setPick('lang')} divider />
          <Row pal={pal} icon="mic" title="Reciter" value={reciter.name.split(' ').slice(-1)[0]} onPress={() => setPick('reciter')} divider />
          <Row pal={pal} icon="speed" title="Recitation speed" value={speedLabel(prefs.speed ?? 1)} onPress={() => setPick('speed')} divider />
          <Row pal={pal} icon="text" title="Text size" value={TEXT_SIZES.find((t) => t.id === (prefs.textSize ?? 'medium'))?.label} onPress={() => setPick('size')} divider />
          <Row pal={pal} icon="play" title="Auto scroll" value={AUTO_PACES.find((x) => x.id === (prefs.autoScroll ?? 'off'))?.label} onPress={() => setPick('auto')} divider />
          <Row pal={pal} icon="text" title="Look" value={{ bold: 'Bold', dark: 'Bold dark', light: 'Quiet', auto: 'Match phone' }[prefs.look ?? 'bold']} onPress={() => setPick('look')} divider />
          <Row pal={pal} icon="sliders" title="Your For you page" value={feedSummary(prefs.feedHide)} onPress={() => setPick('topics')} divider />
        </Group>

        <Section pal={pal} title="Privacy" />
        <Group pal={pal}>
          <Row pal={pal} icon="shield" title="Your data" sub={prefs.shareUsage === false ? 'Nothing shared' : prefs.shareInsights ? 'Anonymous stats and insights on' : 'Anonymous stats on'} onPress={() => router.push('/data')} />
        </Group>

        {acct.online && (
          <>
            {/* Posts */}
            <Section pal={pal} title="Your posts" />
            <Group pal={pal}>
              <Row pal={pal} icon="pen" title="Create a post" sub="A benefit, a reminder or a short video. Every post is checked first." onPress={() => router.push('/post')} highlight />
              {posts?.map((p) => {
                const label = p.status === 'approved' ? 'Live' : p.status === 'pending' ? 'Waiting for review' : p.status === 'rejected' ? 'Not approved' : 'Removed';
                const color = p.status === 'approved' ? pal.accent : p.status === 'pending' ? pal.muted : DANGER;
                return (
                  <View key={p.id} style={[styles.row, { alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.status, { color }]}>{label}</Text>
                      <Text style={[styles.preview, { color: pal.text }]} numberOfLines={3}>
                        {p.kind !== 'text' ? (p.kind === 'image' ? '[Photo] ' : '[Video] ') : ''}
                        {p.body}
                      </Text>
                      {p.status === 'rejected' && !!p.review_note && <Text style={[styles.sub, { color: pal.muted }]}>Why: {p.review_note}</Text>}
                    </View>
                    <Pressable onPress={() => removePost(p)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete post">
                      <Text style={[styles.sub, { color: pal.muted, textDecorationLine: 'underline' }]}>Delete</Text>
                    </Pressable>
                  </View>
                );
              })}
              {waiting !== null && <Row pal={pal} icon="shield" title="Review posts" value={`${waiting} waiting`} valueColor={waiting ? pal.accent : undefined} onPress={() => router.push('/review')} divider />}
            </Group>

            {/* Account */}
            <Section pal={pal} title="Account" />
            <Group pal={pal}>
              <Row pal={pal} icon="chat" title="Send feedback" sub="Report a problem or share an idea" onPress={() => router.push('/feedback')} />
              <Row pal={pal} icon="info" title="Community guidelines" onPress={() => setShowRules(true)} divider />
              <Row pal={pal} icon="user" title="Blocked people" onPress={openBlocked} divider />
              <Row
                pal={pal}
                icon="out"
                title="Sign out"
                danger
                divider
                onPress={async () => {
                  await acct.signOut();
                  toast('Signed out');
                  // Back to Home, which works without an account.
                  router.navigate('/');
                }}
              />
            </Group>
            <GuidelinesSheet visible={showRules} onClose={() => setShowRules(false)} pal={pal} />
            <Sheet visible={blocked !== null} onClose={() => setBlocked(null)} title="Blocked people" pal={pal}>
              {blocked && blocked.length === 0 && !blockedLoading && (
                <Text style={[styles.sub, { color: pal.muted }]}>Nobody blocked. To block someone, tap Block next to their reflection.</Text>
              )}
              {blocked?.map((b) => (
                <View key={b.id} style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pal.line, paddingHorizontal: 0 }]}>
                  <Text style={[styles.rowTitle, { color: pal.text, flex: 1 }]}>{b.handle}</Text>
                  <Pressable
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Unblock ${b.handle}`}
                    onPress={async () => {
                      try {
                        await acct.unblockUser(b.id);
                        setBlocked((l) => l?.filter((x) => x.id !== b.id) ?? null);
                        toast(`Unblocked ${b.handle}`);
                      } catch {
                        toast("Couldn't unblock. Try again");
                      }
                    }}
                  >
                    <Text style={[styles.sub, { color: pal.accent, fontFamily: fonts.uiSemi }]}>Unblock</Text>
                  </Pressable>
                </View>
              ))}
            </Sheet>
            {!confirmDelete ? (
              <Pressable onPress={() => setConfirmDelete(true)} style={styles.dangerLink} accessibilityRole="button">
                <Text style={[styles.sub, { color: pal.muted, textDecorationLine: 'underline' }]}>Delete my account</Text>
              </Pressable>
            ) : (
              <View style={[styles.card, styles.pad, { backgroundColor: pal.surface, borderWidth: 1, borderColor: DANGER, gap: 12 }]}>
                <Text style={[styles.sub, { color: pal.text }]}>
                  This permanently deletes your account, progress, saved ayat, likes and reflections. It can't be undone.
                </Text>
                <View style={styles.nameRow}>
                  <Pressable onPress={() => setConfirmDelete(false)} style={[styles.save, { backgroundColor: pal.bg, flex: 1, paddingVertical: 12 }]} accessibilityRole="button">
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
                    style={[styles.save, { backgroundColor: DANGER, flex: 1, paddingVertical: 12 }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.saveText, { color: '#FFFFFF', textAlign: 'center' }]}>Delete forever</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
        <Text style={[styles.version, { color: pal.muted }]}>{version}</Text>
      </ScrollView>

      {/* Choosers */}
      <Sheet visible={pick === 'reminder'} onClose={() => setPick(null)} title="Daily reminder" pal={pal}>
        <Choice pal={pal} on={!prefs.reminders.on} title="Off" sub="No reminders" onPress={() => prefs.set({ remindersOffered: true, reminders: { ...prefs.reminders, on: false } })} />
        {REMINDER_TIMES.map((t) => (
          <Choice
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
        {prefs.reminders.on && (
          <Choice
            pal={pal}
            box
            on={prefs.reminders.friday}
            title="Surah al-Kahf on Fridays"
            sub="Fridays' reminder becomes al-Kahf"
            onPress={() => prefs.set({ reminders: { ...prefs.reminders, friday: !prefs.reminders.friday } })}
          />
        )}
      </Sheet>
      <Sheet visible={pick === 'lang'} onClose={() => setPick(null)} title="Translation" pal={pal}>
        {LANGS.map((l) => (
          <Choice key={l.id} pal={pal} on={prefs.lang === l.id} title={l.native ? `${l.name}  ${l.native}` : l.name} sub={l.by} onPress={() => prefs.set({ lang: l.id })} />
        ))}
      </Sheet>
      <FeedTopicsSheet visible={pick === 'topics'} onClose={() => setPick(null)} pal={pal} />
      <Sheet visible={pick === 'look'} onClose={() => setPick(null)} title="Look" pal={pal}>
        <View style={{ gap: 8 }}>
          <Choice pal={pal} on={(prefs.look ?? 'bold') === 'bold'} title="Bold" sub="Light background with bright colour" onPress={() => prefs.set({ look: 'bold' })} />
          <Choice pal={pal} on={prefs.look === 'dark'} title="Bold dark" sub="Black background with bright colour" onPress={() => prefs.set({ look: 'dark' })} />
          <Choice pal={pal} on={prefs.look === 'light'} title="Quiet" sub="Soft and calm, Munib's original look" onPress={() => prefs.set({ look: 'light' })} />
          <Choice pal={pal} on={prefs.look === 'auto'} title="Match phone" sub="Bold, dark when your phone is in dark mode" onPress={() => prefs.set({ look: 'auto' })} />
        </View>
      </Sheet>
      <Sheet visible={pick === 'auto'} onClose={() => setPick(null)} title="Auto scroll" pal={pal}>
        {AUTO_PACES.map((x) => (
          <Choice
            key={x.id}
            pal={pal}
            on={(prefs.autoScroll ?? 'off') === x.id}
            title={x.label}
            sub={x.id === 'off' ? 'Swipe to the next card yourself' : 'On the Quran tab: follows the recitation, or this reading pace with the sound paused'}
            onPress={() => prefs.set({ autoScroll: x.id })}
          />
        ))}
      </Sheet>
      <Sheet visible={pick === 'speed'} onClose={() => setPick(null)} title="Recitation speed" pal={pal}>
        {SPEEDS.map((x) => (
          <Choice key={x} pal={pal} on={(prefs.speed ?? 1) === x} title={speedLabel(x)} sub={x < 1 ? 'Slower, to follow along or learn' : x === 1 ? 'As the reciter recited it' : 'Faster, for revision'} onPress={() => prefs.set({ speed: x })} />
        ))}
      </Sheet>
      <Sheet visible={pick === 'size'} onClose={() => setPick(null)} title="Text size" pal={pal}>
        {TEXT_SIZES.map((t) => (
          <Choice key={t.id} pal={pal} on={(prefs.textSize ?? 'medium') === t.id} title={t.label} onPress={() => prefs.set({ textSize: t.id })} />
        ))}
        <View style={{ alignItems: 'flex-end', paddingTop: 8 }}>
          <Text style={{ fontFamily: fonts.arabic, fontSize: 30 * textScale(prefs.textSize), lineHeight: 30 * textScale(prefs.textSize) * 1.9, color: pal.text }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
        </View>
        <Text style={{ fontFamily: fonts.read, fontSize: 18 * textScale(prefs.textSize), lineHeight: 18 * textScale(prefs.textSize) * 1.5, color: pal.text }}>In the name of Allah, the Entirely Merciful, the Especially Merciful.</Text>
      </Sheet>
      <Sheet visible={pick === 'reciter'} onClose={() => setPick(null)} title="Reciter" pal={pal}>
        {RECITERS.map((r) => (
          <Choice key={r.id} pal={pal} on={prefs.reciter === r.id} title={r.name} sub={r.note} onPress={() => prefs.set({ reciter: r.id })} />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  plusCard: { borderRadius: 22, padding: 18, gap: 3, overflow: 'hidden', paddingRight: 110 },
  plusArt: { position: 'absolute', right: -14, top: -6, width: 118, height: 118 },
  plusEyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.8)' },
  plusTitle: { fontFamily: fonts.uiBold, fontSize: 18, lineHeight: 23, color: '#FFFFFF' },
  plusSub: { fontFamily: fonts.ui, fontSize: 13.5, color: 'rgba(255,255,255,0.88)' },
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 6 },
  title: { fontFamily: fonts.read, fontSize: 36, letterSpacing: -0.6 },
  x: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 12 },
  card: { borderRadius: 16, overflow: 'hidden' },
  pad: { padding: 16, gap: 10 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.2 },
  big: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.4, marginTop: -4 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  sub: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 14 },
  stat: { flex: 1, gap: 1 },
  statN: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statL: { fontFamily: fonts.ui, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: fonts.uiBold, fontSize: 19, letterSpacing: -0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  value: { fontFamily: fonts.ui, fontSize: 15 },
  key: { fontFamily: fonts.uiBold, fontSize: 13.5, fontVariant: ['tabular-nums'], minWidth: 44 },
  preview: { fontFamily: fonts.read, fontSize: 15, flex: 1 },
  status: { fontFamily: fonts.uiBold, fontSize: 12.5, letterSpacing: 0.3 },
  nameRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, fontFamily: fonts.ui, fontSize: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  save: { borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  saveText: { fontFamily: fonts.uiBold, fontSize: 15 },
  dangerLink: { alignSelf: 'center', paddingVertical: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  version: { fontFamily: fonts.ui, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
