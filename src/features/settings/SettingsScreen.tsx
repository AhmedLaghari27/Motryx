import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/routes';
import { Button, Card, Screen, Text } from '@/components';
import { PermissionsSection } from '@/features/permissions/PermissionsSection';
import { useOnboardingStore } from '@/state/onboarding.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export function SettingsScreen() {
  const { mode, setMode } = useTheme();
  const reopenOnboarding = useOnboardingStore((s) => s.reopen);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen scroll>
      <Text variant="title">Appearance</Text>
      <Card>
        <Text tone="secondary">
          Night is easier on the eyes after dark. Daylight has stronger contrast for bright sun.
        </Text>
        <View style={styles.row}>
          <Button
            label="Night"
            variant={mode === 'night' ? 'primary' : 'secondary'}
            onPress={() => setMode('night')}
            style={styles.flex}
          />
          <Button
            label="Daylight"
            variant={mode === 'daylight' ? 'primary' : 'secondary'}
            onPress={() => setMode('daylight')}
            style={styles.flex}
          />
        </View>
      </Card>

      <PermissionsSection />

      <Text variant="title">About</Text>
      <Card>
        <Text tone="secondary">Review what Motryx needs, and the safety and privacy notes.</Text>
        <Button label="Replay welcome" variant="secondary" onPress={() => void reopenOnboarding()} />
      </Card>

      {__DEV__ ? (
        <>
          <Text variant="title">Developer</Text>
          <Button
            label="Design system preview"
            variant="secondary"
            onPress={() => navigation.navigate('DesignPreview')}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
