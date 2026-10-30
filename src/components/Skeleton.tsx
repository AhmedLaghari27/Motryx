import React from 'react';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { usePulse } from './usePulse';

type Props = { width: number | `${number}%`; height: number; radius?: number };

export function Skeleton({ width, height, radius = 8 }: Props) {
  const { colors } = useTheme();
  const pulse = usePulse(true);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceRaised }, pulse]}
    />
  );
}
