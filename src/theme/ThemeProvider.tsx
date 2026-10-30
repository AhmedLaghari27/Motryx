import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { colorsByMode, type ThemeColors, type ThemeMode } from './tokens';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode = 'night',
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
}) {
  // Persistence arrives with the Settings + SQLite steps.
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const value = useMemo(() => ({ mode, colors: colorsByMode[mode], setMode }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
