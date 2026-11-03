import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  /** Spoken label; say what it does for THIS item, e.g. "Add Engine RPM to cockpit" */
  label: string;
  onPress: () => void;
  selected?: boolean;
  filled?: boolean;
};

/** A 44 dp icon-only button. */
export function IconButton({ icon, label, onPress, selected = false, filled = false }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Icon name={icon} size={22} color={selected ? colors.accent : colors.textSecondary} filled={filled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
