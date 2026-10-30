import { useEffect } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme/tokens';

/**
 * Opacity pulse for state that is genuinely in progress (connecting, discovering).
 * Stops when inactive and never loops under reduce-motion.
 */
export function usePulse(active: boolean, low = 0.4) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active && !reduce) {
      opacity.value = withRepeat(withTiming(low, { duration: motion.duration.pulse }), -1, true);
    } else {
      cancelAnimation(opacity);
      opacity.value = active ? 0.7 : 1;
    }
    return () => cancelAnimation(opacity);
  }, [active, reduce, low, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
