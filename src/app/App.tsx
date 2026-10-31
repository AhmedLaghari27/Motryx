import React, { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useOnboardingStore } from '@/state/onboarding.store';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { RootNavigator } from './navigation';

function ThemedApp() {
  const { mode, colors } = useTheme();
  const hydrate = useOnboardingStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const navTheme = useMemo(() => {
    const base = mode === 'night' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.bg,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.error,
      },
    };
  }, [mode, colors]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'night' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ThemedApp />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
