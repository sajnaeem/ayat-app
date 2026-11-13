import { useRouter } from "expo-router";
import type React from "react";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { juzOf, juzStart, PAGES, pageOf, pageStart } from "@/data/mushaf";
import { surahDone, useProgress } from "@/lib/progress";
import { jumpToPage, showFeed } from "@/lib/nav";
import { usePrefs } from "@/lib/store";
import { arabicNumber, revealedIn, SURAHS } from "@/lib/quran";
import { fold } from "@/lib/fold";
import { fonts, mix, usePalette } from "@/lib/theme";

const POPULAR = [18, 36, 67, 55, 56, 1, 112];
type Tab = "surah" | "juz" | "page";
const label = (s: number, a: number) => `${SURAHS[s - 1][0]} ${s}:${a}`;

/**
 * Go to any part of the Quran: by surah, juz or page.
 * Used by the Quran tab and the "Go to" screen (the surah name on a card, search): picking opens the feed's
 * Quran reading there. From page view (toPages) it turns the page view to that page instead.
 * `title` and `close` set the header; `extra` sits above the list (the Quran tab's tools).
 */
export function QuranIndex({ toPages = false, title = "Go to", close = false, extra, bottomPad }: { toPages?: boolean; title?: string; close?: boolean; extra?: React.ReactNode; bottomPad?: number }) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { progress } = useProgress();
  const prefs = usePrefs();
  const [tab, setTab] = useState<Tab>("surah");
  const [q, setQ] = useState("");
  const [pageQ, setPageQ] = useState("");

  const here = toPages
    ? pageStart(prefs.mushafPage || 1)
    : prefs.place
      ? [prefs.place.s, prefs.place.a]
      : null;
  const hereJuz = here ? juzOf(here[0], here[1]) : 0;
  const hereS = here ? here[0] : 0;

  const list = useMemo(() => {
    const all = SURAHS.map((x, i) => ({
      s: i + 1,
      name: x[0],
      ar: x[1],
      meaning: x[2],
      count: x[3],
    }));
    const t = q.trim();
    if (!t) return all;
    if (/^\d+$/.test(t)) return all.filter((x) => String(x.s).startsWith(t));
    const f = fold(t);
    return all.filter(
      (x) =>
        fold(x.name).includes(f) ||
        fold(x.meaning).includes(f) ||
        x.ar.includes(t),
    );
  }, [q]);

  const go = (s: number, a = 1) => {
    if (toPages) {
      jumpToPage(pageOf(s, a));
      router.back();
      return;
    }
    prefs.readAt(s, a);
    showFeed(router);
  };
  const goPage = (p: number) => {
    if (toPages) {
      jumpToPage(p);
      router.back();
      return;
    }
    const [s, a] = pageStart(p);
    go(s, a);
  };
  const typed = Number(pageQ);
  const pageOk = Number.isInteger(typed) && typed >= 1 && typed <= PAGES;

  const header = (
    <View style={{ padding: 18, paddingBottom: 10, gap: 14 }}>
      {extra}
      {here && (
        <Pressable
          onPress={() => (toPages ? router.back() : go(here[0], here[1]))}
          style={({ pressed }) => [
            styles.cont,
            {
              backgroundColor: pressed
                ? mix(pal.surface, pal.accent, 0.12)
                : mix(pal.surface, pal.accent, 0.06),
              borderColor: mix(pal.line, pal.accent, 0.4),
            },
          ]}
          accessibilityRole="button"
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.contEyebrow, { color: pal.accent }]}>
              {toPages ? "YOU’RE ON" : "CONTINUE WHERE YOU LEFT OFF"}
            </Text>
            <Text style={[styles.name, { color: pal.text }]}>
              {toPages
                ? `Page ${prefs.mushafPage || 1} · ${SURAHS[here[0] - 1][0]}`
                : label(here[0], here[1])}
            </Text>
            <Text style={[styles.meta, { color: pal.muted }]}>
              Juz {hereJuz} · Page{" "}
              {toPages ? prefs.mushafPage || 1 : pageOf(here[0], here[1])}
            </Text>
          </View>
          <Icon name="chevron" size={18} color={pal.accent} />
        </Pressable>
      )}
      <View
        style={[styles.seg, { backgroundColor: mix(pal.bg, pal.text, 0.06) }]}
        accessibilityRole="tablist"
      >
        {(
          [
            ["surah", "Surah"],
            ["juz", "Juz"],
            ["page", "Page"],
          ] as const
        ).map(([t, l]) => {
          const on = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.segBtn,
                on && { backgroundColor: pal.surface, shadowOpacity: 0.08 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text
                style={[styles.segText, { color: on ? pal.text : pal.muted }]}
              >
                {l}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {tab === "surah" && (
        <>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search: Yasin, Mulk, 18…"
            placeholderTextColor={pal.muted}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={[
              styles.search,
              {
                color: pal.text,
                borderColor: pal.line,
                backgroundColor: pal.surface,
              },
            ]}
            accessibilityLabel="Search surahs"
          />
          {!q && (
            <View style={styles.chips}>
              {POPULAR.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => go(s)}
                  style={[
                    styles.chip,
                    { borderColor: pal.line, backgroundColor: pal.surface },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, { color: pal.text }]}>
                    {SURAHS[s - 1][0]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!q && list.length === 0 && (
            <Text style={[styles.meta, { color: pal.muted }]}>
              No surah matches "{q}".
            </Text>
          )}
        </>
      )}
      {tab === "page" && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={pageQ}
              onChangeText={(t) => setPageQ(t.replace(/\D/g, "").slice(0, 3))}
              placeholder={`Page number, 1 to ${PAGES}`}
              placeholderTextColor={pal.muted}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={() => pageOk && goPage(typed)}
              style={[
                styles.search,
                {
                  flex: 1,
                  color: pal.text,
                  borderColor: pal.line,
                  backgroundColor: pal.surface,
                },
              ]}
              accessibilityLabel="Page number"
            />
            <Pressable
              onPress={() => pageOk && goPage(typed)}
              disabled={!pageOk}
              style={[
                styles.goBtn,
                { backgroundColor: pal.text, opacity: pageOk ? 1 : 0.35 },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.goText, { color: pal.bg }]}>Go</Text>
            </Pressable>
          </View>
          {pageOk ? (
            <Text style={[styles.meta, { color: pal.muted }]}>
              Page {typed} starts at {label(...pageStart(typed))} · Juz{" "}
              {juzOf(...pageStart(typed))}
            </Text>
          ) : (
            <Text style={[styles.meta, { color: pal.muted }]}>
              The page numbers of the printed Madani Mushaf, the copy most
              mosques use.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View
        style={[
          styles.head,
          { paddingTop: insets.top + 12, borderBottomColor: close ? pal.line : "transparent" },
        ]}
      >
        <Text style={[styles.title, { color: pal.text, flex: 1 }, !close && styles.tabTitle]}>{title}</Text>
        {close && (
        <Pressable
          onPress={() => router.back()}
          style={[styles.x, { borderColor: pal.line }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
        )}
      </View>
      {tab === "surah" ? (
        <FlatList
          key="surah"
          data={list}
          keyExtractor={(x) => String(x.s)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: bottomPad ?? insets.bottom + 24 }}
          ListHeaderComponent={header}
          renderItem={({ item }) => {
            const done = surahDone(progress, item.s);
            const now = item.s === hereS;
            return (
              <Pressable
                onPress={() => go(item.s)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: pal.line,
                    backgroundColor:
                      pressed || now
                        ? mix(pal.bg, pal.accent, 0.08)
                        : "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.s}. ${item.name}, ${item.meaning}, ${item.count} ayat, revealed in ${revealedIn(item.s)}${done ? ", read" : ""}${now ? ", you are here" : ""}`}
              >
                <View
                  style={[
                    styles.num,
                    {
                      borderColor: done ? pal.accent : pal.line,
                      backgroundColor: done ? pal.accent : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.numText,
                      { color: done ? pal.onAccent : pal.muted },
                    ]}
                  >
                    {item.s}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.name, { color: pal.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.meta,
                      { color: now ? pal.accent : pal.muted },
                    ]}
                  >
                    {now ? "You’re here · " : ""}
                    {item.meaning} · {item.count} ayat ·{" "}
                    {revealedIn(item.s) === "Makkah" ? "Makkan" : "Madinan"}
                    {done ? " · read" : ""}
                  </Text>
                </View>
                <Text style={[styles.ar, { color: pal.text }]}>{item.ar}</Text>
              </Pressable>
            );
          }}
        />
      ) : tab === "juz" ? (
        <FlatList
          key="juz"
          data={Array.from({ length: 30 }, (_, i) => i + 1)}
          keyExtractor={(j) => String(j)}
          contentContainerStyle={{ paddingBottom: bottomPad ?? insets.bottom + 24 }}
          ListHeaderComponent={header}
          renderItem={({ item: j }) => {
            const [s, a] = juzStart(j);
            const now = j === hereJuz;
            return (
              <Pressable
                onPress={() => go(s, a)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: pal.line,
                    backgroundColor:
                      pressed || now
                        ? mix(pal.bg, pal.accent, 0.08)
                        : "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Juz ${j}, starts at ${label(s, a)}${now ? ", you are here" : ""}`}
              >
                <View
                  style={[
                    styles.num,
                    { borderColor: now ? pal.accent : pal.line },
                  ]}
                >
                  <Text
                    style={[
                      styles.numText,
                      { color: now ? pal.accent : pal.muted },
                    ]}
                  >
                    {j}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.name, { color: pal.text }]}>
                    Juz {j}
                  </Text>
                  <Text
                    style={[
                      styles.meta,
                      { color: now ? pal.accent : pal.muted },
                    ]}
                  >
                    {now ? "You’re here · " : ""}Starts at {label(s, a)} · page{" "}
                    {pageOf(s, a)}
                  </Text>
                </View>
                <Text style={[styles.ar, { color: pal.muted, fontSize: 18 }]}>
                  {arabicNumber(j)}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">{header}</ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabTitle: { fontSize: 30, letterSpacing: -0.6 },
  root: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  x: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cont: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  contEyebrow: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.1 },
  seg: { flexDirection: "row", borderRadius: 12, padding: 3 },
  segBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    borderRadius: 9,
    shadowColor: "#000",
    shadowOpacity: 0,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  search: {
    fontFamily: fonts.ui,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  goBtn: {
    borderRadius: 10,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  goText: { fontFamily: fonts.uiBold, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontFamily: fonts.uiSemi, fontSize: 12 },
  name: { fontFamily: fonts.uiSemi, fontSize: 16 },
  meta: { fontFamily: fonts.ui, fontSize: 13 },
  ar: { fontFamily: fonts.arabic, fontSize: 20 },
});
