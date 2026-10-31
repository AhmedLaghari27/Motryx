import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon, LoadingState, Screen } from '@/components';
import { CockpitScreen } from '@/features/cockpit/CockpitScreen';
import { DiagnosticsScreen } from '@/features/diagnostics/DiagnosticsScreen';
import { GarageScreen } from '@/features/garage/GarageScreen';
import { LiveDataScreen } from '@/features/live-data/LiveDataScreen';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { useOnboardingStore } from '@/state/onboarding.store';
import { useTheme } from '@/theme/ThemeProvider';
import { HeaderActions } from './HeaderActions';
import type { RootStackParamList, TabParamList } from './routes';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Dev-only screen. Required lazily so release builds never register it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DesignPreviewScreen: React.ComponentType | null = __DEV__ ? require('@/dev/DesignPreviewScreen').default : null;

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg, borderBottomWidth: 0, shadowOpacity: 0, elevation: 0 },
        headerTitleStyle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
        headerRight: () => <HeaderActions />,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Cockpit"
        component={CockpitScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="cockpit" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="LiveData"
        component={LiveDataScreen}
        options={{ title: 'Live Data', tabBarIcon: ({ color, size }) => <Icon name="live" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Diagnostics"
        component={DiagnosticsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="diagnostics" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Garage"
        component={GarageScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="garage" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors } = useTheme();
  const status = useOnboardingStore((s) => s.status);

  // Brief hold while the saved first-run flag is read, so the intro never flashes for returning users.
  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState label="Starting Motryx" />
      </Screen>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {status === 'needed' ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false, animation: 'fade' }} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          {DesignPreviewScreen ? (
            <Stack.Screen name="DesignPreview" component={DesignPreviewScreen} options={{ title: 'Design system' }} />
          ) : null}
        </>
      )}
    </Stack.Navigator>
  );
}
