import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { minTouchTarget, motion, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
}: Props) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const animateTo = (to: number) => {
    scale.set(reduce ? 1 : withTiming(to, { duration: motion.duration.micro }));
  };

  const palette = {
    primary: { bg: colors.accent, pressed: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: colors.surfaceRaised, pressed: colors.surfacePressed, fg: colors.textPrimary, border: colors.border },
    ghost: { bg: 'transparent', pressed: colors.surfacePressed, fg: colors.accent, border: 'transparent' },
    destructive: { bg: colors.error, pressed: colors.error, fg: colors.onAccent, border: colors.error },
  }[variant];

  const inactive = disabled || loading;

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={onPress}
        onPressIn={() => animateTo(motion.pressScale)}
        onPressOut={() => animateTo(1)}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: pressed ? palette.pressed : palette.bg,
            borderColor: palette.border,
            opacity: disabled ? 0.4 : pressed && variant === 'primary' ? 0.9 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <Text variant="button" style={{ color: palette.fg }}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
