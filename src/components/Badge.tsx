import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = { label: string; tone?: 'live' | 'neutral' | 'warn' };

/** Small status label. Always text, never color alone. */
export function Badge({ label, tone = 'neutral' }: Props) {
  const { colors } = useTheme();
  const color = tone === 'live' ? colors.live : tone === 'warn' ? colors.warn : colors.textSecondary;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.chip },
});
