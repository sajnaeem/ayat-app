import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { supabase } from '@/lib/supabase';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

/** Munib stats (reviewers only): anonymous totals from usage_summary() in supabase/018_usage.sql. */
type Summary = {
  daily: { day: string; users: number; ayat: number; minutes: number }[] | null;
  features: { feature: string; users: number }[] | null;
  countries: { country: string; users: number }[] | null;
  retention: { cohort: string; d0: number; d1: number; d7: number; d30: number }[] | null;
  journey: { question: string; answer: string; users: number }[] | null;
};

export default function Stats() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null | 'none'>(null);
  useEffect(() => {
    setData(null);
    supabase?.rpc('usage_summary', { days }).then(({ data: d, error }) => setData(error || !d ? 'none' : (d as Summary)));
  }, [days]);

  const daily = data && data !== 'none' ? data.daily ?? [] : [];
  const last = daily[daily.length - 1];
  const avg = daily.length ? Math.round(daily.reduce((a, d) => a + d.users, 0) / daily.length) : 0;
  const ayat = daily.reduce((a, d) => a + d.ayat, 0);
  const max = Math.max(1, ...daily.map((d) => d.users));

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Munib stats</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.chips}>
          {[7, 30, 90].map((d) => (
            <Pressable key={d} onPress={() => setDays(d)} style={[styles.chip, { backgroundColor: d === days ? pal.text : pal.surface }]} accessibilityRole="button">
              <Text style={[styles.chipText, { color: d === days ? pal.bg : pal.text }]}>{d} days</Text>
            </Pressable>
          ))}
        </View>
        {data === null && <ActivityIndicator color={pal.accent} style={{ marginTop: 30 }} />}
        {data === 'none' && <Text style={[styles.small, { color: pal.muted }]}>No stats yet, or this account isn’t on the team. Phones send each day’s totals the next time Munib opens.</Text>}
        {data && data !== 'none' && (
          <>
            <View style={styles.row3}>
              <Big pal={pal} n={last?.users ?? 0} label={`readers on ${last ? new Date(last.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–'}`} />
              <Big pal={pal} n={avg} label="a day on average" />
              <Big pal={pal} n={ayat} label="ayat read" />
            </View>

            <Card pal={pal} title="Readers each day">
              <View style={styles.bars}>
                {daily.map((d) => (
                  <View key={d.day} style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <View style={{ height: Math.max(2, (d.users / max) * 110), backgroundColor: pal.accent, borderRadius: 3 }} />
                  </View>
                ))}
              </View>
            </Card>

            <Card pal={pal} title="Coming back (by the week people started)">
              {(data.retention ?? []).slice(-8).map((r) => (
                <View key={r.cohort} style={styles.line}>
                  <Text style={[styles.small, { color: pal.text, width: 70 }]}>{new Date(r.cohort).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                  <Text style={[styles.small, { color: pal.muted, width: 52 }]}>{r.d0} new</Text>
                  {(['d1', 'd7', 'd30'] as const).map((k) => (
                    <Text key={k} style={[styles.small, { color: pal.text, flex: 1, textAlign: 'right' }]}>
                      {k.replace('d', 'Day ')}: {r.d0 >= 20 ? `${Math.round((r[k] / r.d0) * 100)}%` : '–'}
                    </Text>
                  ))}
                </View>
              ))}
              <Text style={[styles.tiny, { color: pal.muted }]}>Percentages show once a week has 20 or more new readers.</Text>
            </Card>

            <Card pal={pal} title="Most used">
              <List pal={pal} items={(data.features ?? []).map((f) => [f.feature.replace(/_/g, ' '), f.users])} />
            </Card>
            <Card pal={pal} title="Countries">
              <List pal={pal} items={(data.countries ?? []).map((c) => [c.country, c.users])} />
            </Card>
            <Card pal={pal} title="Insights (people who opted in)">
              <List pal={pal} items={(data.journey ?? []).map((j) => [`${j.question.replace(/_/g, ' ')}: ${j.answer}`, j.users])} />
            </Card>
            <Text style={[styles.tiny, { color: pal.muted, paddingHorizontal: 4 }]}>Anonymous: one row per phone per day, no account or device IDs. Groups under 20 aren’t shown.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Big({ pal, n, label }: { pal: Palette; n: number; label: string }) {
  return (
    <View style={[styles.big, { backgroundColor: pal.surface }]}>
      <Text style={[styles.bigN, { color: pal.text }]}>{n.toLocaleString('en-GB')}</Text>
      <Text style={[styles.tiny, { color: pal.muted }]}>{label}</Text>
    </View>
  );
}
function Card({ pal, title, children }: { pal: Palette; title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { backgroundColor: pal.surface }]}>
      <Text style={[styles.cardTitle, { color: pal.text }]}>{title}</Text>
      {children}
    </View>
  );
}
function List({ pal, items }: { pal: Palette; items: [string, number][] }) {
  if (!items.length) return <Text style={[styles.small, { color: pal.muted }]}>Not enough people yet (groups under 20 are hidden).</Text>;
  const top = Math.max(...items.map((i) => i[1]));
  return (
    <View style={{ gap: 6 }}>
      {items.slice(0, 15).map(([k, v]) => (
        <View key={k} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[styles.small, { color: pal.text }]}>{k}</Text>
            <Text style={[styles.small, { color: pal.muted }]}>{v.toLocaleString('en-GB')}</Text>
          </View>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: mix(pal.surface, pal.text, 0.06) }}>
            <View style={{ width: `${(v / top) * 100}%`, height: 5, borderRadius: 3, backgroundColor: pal.accent }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, flex: 1 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  row3: { flexDirection: 'row', gap: 8 },
  big: { flex: 1, borderRadius: 18, padding: 12, gap: 2 },
  bigN: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5 },
  card: { borderRadius: 20, padding: 16, gap: 10 },
  cardTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 112 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  small: { fontFamily: fonts.ui, fontSize: 13.5 },
  tiny: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
});
