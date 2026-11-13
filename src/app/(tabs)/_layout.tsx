import { Tabs } from 'expo-router/tabs';
import { TabBar, TABS } from '@/components/TabBar';
import { usePalette } from '@/lib/theme';

/** Home (the feed), Quran, Prayer, Together and You. Everything else opens on top of these. */
export default function TabsLayout() {
  const pal = usePalette();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: pal.bg } }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
