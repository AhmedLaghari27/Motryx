import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Cockpit: undefined;
  LiveData: undefined;
  Diagnostics: undefined;
  Garage: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Settings: undefined;
  DesignPreview: undefined;
};
