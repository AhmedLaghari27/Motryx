/** Design tokens. Components read semantic tokens through useTheme(); never hard-code colors. */

export type ThemeMode = 'night' | 'daylight';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfacePressed: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  accent: string;
  onAccent: string;
  live: string;
  warn: string;
  error: string;
  stale: string;
  unsupported: string;
};

// "Night cockpit": tinted near-black, warm instrument backlight accent.
export const nightColors: ThemeColors = {
  bg: '#12151A',
  surface: '#1B2027',
  surfaceRaised: '#242B34',
  surfacePressed: '#2C343F',
  border: '#2E3640',
  textPrimary: '#EEF1F4',
  textSecondary: '#98A3B0',
  textDisabled: '#6B7683',
  accent: '#FFB347',
  onAccent: '#1A1204',
  live: '#4FD1A5',
  warn: '#FFC857',
  error: '#FF5A4F',
  stale: '#8A95A3',
  unsupported: '#7C8794',
};

// Daylight: high contrast for sunlit windshield mounts.
export const daylightColors: ThemeColors = {
  bg: '#F4F1EC',
  surface: '#FFFFFF',
  surfaceRaised: '#ECE8E1',
  surfacePressed: '#E2DDD4',
  border: '#D7D2C9',
  textPrimary: '#14171C',
  textSecondary: '#4A5460',
  textDisabled: '#7A838D',
  accent: '#B25E00',
  onAccent: '#FFFFFF',
  live: '#0B7A5A',
  warn: '#8A5A00',
  error: '#C4281C',
  stale: '#5E6873',
  unsupported: '#5E6873',
};

export const colorsByMode: Record<ThemeMode, ThemeColors> = {
  night: nightColors,
  daylight: daylightColors,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48 } as const;

export const radius = { chip: 999, control: 12, tile: 16, sheet: 24, hero: 28 } as const;

export const minTouchTarget = 48;

export type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
};

// System fonts for now. Swapping in a custom numeric face later is a one-place change.
export const typography = {
  hero: { fontSize: 88, lineHeight: 92, fontWeight: '700', letterSpacing: -1 },
  value: { fontSize: 36, lineHeight: 40, fontWeight: '700' },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  unit: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

/** Durations in ms. Motion confirms actions, explains change, or conveys live state. */
export const motion = {
  duration: { micro: 100, standard: 220, emphasis: 600, pulse: 700 },
  pressScale: 0.97,
} as const;
