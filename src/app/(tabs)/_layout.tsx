import { Tabs } from 'expo-router/tabs';
import { HIDDEN_TABS, TabBar, TABS } from '@/components/TabBar';
import { usePalette } from '@/lib/theme';

/** Home (the feed), Quran, Ask, Prayer and Together; You opens from the profile button. Everything else opens on top of these. */
export default function TabsLayout() {
  const pal = usePalette();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: pal.bg } }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
      {HIDDEN_TABS.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
