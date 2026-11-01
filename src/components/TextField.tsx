import React, { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { minTouchTarget, radius, spacing, typography } from '@/theme/tokens';
import { Text } from './Text';

/** The ref type of a TextInput, for focusing the next field. */
export type TextFieldHandle = ComponentRef<typeof TextInput>;

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  helper?: string;
  inputRef?: Ref<TextFieldHandle>;
};

/** Labeled text input with visible focus, helper and error text. Font stays 16+ so iOS never zooms. */
export function TextField({ label, error, helper, inputRef, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        placeholderTextColor={colors.textDisabled}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor,
            fontSize: typography.body.fontSize,
          },
        ]}
      />
      {error ? (
        <Text variant="caption" tone="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="secondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1.5,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
