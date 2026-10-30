import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typography, type ThemeColors, type TypographyVariant } from '@/theme/tokens';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'accent'
  | 'live'
  | 'warn'
  | 'error'
  | 'stale';

const toneKey: Record<TextTone, keyof ThemeColors> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  disabled: 'textDisabled',
  accent: 'accent',
  live: 'live',
  warn: 'warn',
  error: 'error',
  stale: 'stale',
};

// Tabular figures stop live digits changing width, so layouts never jitter.
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

type Props = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** use for any live-changing number */
  numeric?: boolean;
};

export function Text({ variant = 'body', tone = 'primary', numeric = false, style, ...rest }: Props) {
  const { colors } = useTheme();
  const t = typography[variant];
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'hero' ? 1.2 : 1.6}
      {...rest}
      style={[
        {
          color: colors[toneKey[tone]],
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          fontWeight: t.fontWeight,
        },
        numeric ? tabular : null,
        style,
      ]}
    />
  );
}
