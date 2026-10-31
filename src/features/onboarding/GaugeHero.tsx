import React, { useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { arcPath, polar, tickLine, valueToAngle } from '@/utils/gaugeGeometry';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const C = 100; // centre of the 200x200 viewBox
const TRACK_R = 78;
const NEEDLE_LEN = 62;
const TICK_COUNT = 21; // every second tick is major

type Props = { size?: number; restAt?: number };

/**
 * The signature "cluster wake" moment: the needle sweeps to full scale and settles once.
 * It never loops. Under reduce-motion it simply appears at rest.
 */
export function GaugeHero({ size = 220, restAt = 0.62 }: Props) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(restAt);

  useEffect(() => {
    if (reduce) {
      t.set(restAt);
    } else {
      t.set(0);
      t.set(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
          withTiming(restAt, { duration: 680, easing: Easing.inOut(Easing.cubic) }),
        ),
      );
    }
    return () => cancelAnimation(t);
  }, [reduce, restAt, t]);

  const needleProps = useAnimatedProps(() => {
    const p = polar(C, C, NEEDLE_LEN, valueToAngle(t.get()));
    return { x2: p.x, y2: p.y };
  });

  const geometry = useMemo(
    () => ({
      track: arcPath(C, C, TRACK_R, 0, 1),
      redline: arcPath(C, C, TRACK_R, 0.84, 1),
      ticks: Array.from({ length: TICK_COUNT }, (_, i) => {
        const major = i % 2 === 0;
        return { major, ...tickLine(C, C, major ? 87 : 90, 95, i / (TICK_COUNT - 1)) };
      }),
    }),
    [],
  );

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={geometry.track} stroke={colors.surfaceRaised} strokeWidth={10} strokeLinecap="round" fill="none" />
      <Path d={geometry.redline} stroke={colors.error} strokeWidth={10} strokeLinecap="round" fill="none" />
      {geometry.ticks.map((tick, i) => (
        <Line
          key={i}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={tick.major ? colors.textSecondary : colors.textDisabled}
          strokeWidth={tick.major ? 2 : 1.2}
          strokeLinecap="round"
        />
      ))}
      <AnimatedLine
        x1={C}
        y1={C}
        x2={C}
        y2={C}
        animatedProps={needleProps}
        stroke={colors.accent}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Circle cx={C} cy={C} r={14} fill={`${colors.accent}22`} />
      <Circle cx={C} cy={C} r={7} fill={colors.accent} />
      <Circle cx={C} cy={C} r={2.5} fill={colors.bg} />
    </Svg>
  );
}
