import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, spacing } from '@/theme/tokens';

const DOT = 8;
const ACTIVE_WIDTH = 24;

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const width = useSharedValue(active ? ACTIVE_WIDTH : DOT);

  useEffect(() => {
    const target = active ? ACTIVE_WIDTH : DOT;
    width.set(reduce ? target : withTiming(target, { duration: motion.duration.standard }));
  }, [active, reduce, width]);

  const style = useAnimatedStyle(() => ({ width: width.get() }));
  return (
    <Animated.View style={[styles.dot, { backgroundColor: active ? colors.accent : colors.border }, style]} />
  );
}

type Props = { count: number; index: number };

export function PageIndicator({ count, index }: Props) {
  return (
    <View accessible accessibilityLabel={`Step ${index + 1} of ${count}`} style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dot: { height: DOT, borderRadius: DOT / 2 },
});
