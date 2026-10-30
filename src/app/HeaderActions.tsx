import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConnectionBadge, Icon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { RootStackParamList } from './routes';

/** Header right side on every tab: connection status always visible, settings one tap away. */
export function HeaderActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <ConnectionBadge />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => navigation.navigate('Settings')}
        style={styles.button}
      >
        <Icon name="settings" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginRight: spacing.sm },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
