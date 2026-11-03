import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = { label: string; selected: boolean; onPress: () => void };

/** A filter chip. The selected state shows in text weight and border, not color alone. */
export function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? `${colors.accent}22` : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <Text variant="label" tone={selected ? 'accent' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 1.5,
  },
});
