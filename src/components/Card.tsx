import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type Props = { children: ReactNode; raised?: boolean; style?: StyleProp<ViewStyle> };

export function Card({ children, raised = false, style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: raised ? colors.surfaceRaised : colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.tile, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
});
