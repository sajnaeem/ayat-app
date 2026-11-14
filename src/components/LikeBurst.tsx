import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { GoldStar } from './Gold';

/** A like that feels like something: the heart pops and eight small gold stars fly out, once, when it turns on. */
export function LikeBurst({ liked, children }: { liked: boolean; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  const was = useRef(liked);
  useEffect(() => {
    if (liked && !was.current) {
      t.setValue(0);
      Animated.timing(t, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    was.current = liked;
  }, [liked, t]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i;
        const far = i % 2 ? 24 : 30;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              opacity: t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * far] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * far] }) },
                { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.6] }) },
              ],
            }}
          >
            <GoldStar size={i % 2 ? 7 : 9} color="#E2A93B" />
          </Animated.View>
        );
      })}
      <Animated.View style={{ transform: [{ scale: t.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [1, 1.38, 0.94, 1] }) }] }}>{children}</Animated.View>
    </View>
  );
}
