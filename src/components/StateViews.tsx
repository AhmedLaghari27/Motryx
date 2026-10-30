import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

type StateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
};

function StateView({ tone, icon, title, message, actionLabel, onAction }: StateProps & { tone: 'neutral' | 'error' }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      {icon ? (
        <Icon name={icon} size={40} color={tone === 'error' ? colors.error : colors.textSecondary} />
      ) : null}
      <Text variant="title" style={styles.centerText}>
        {title}
      </Text>
      {message ? (
        <Text tone="secondary" style={styles.centerText}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={tone === 'error' ? 'secondary' : 'primary'}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

/** Empty state: invite one clear action. */
export function EmptyState(props: StateProps) {
  return <StateView tone="neutral" icon="inbox" {...props} />;
}

/** Error state: say what happened and what to do next. */
export function ErrorState(props: StateProps) {
  return <StateView tone="error" icon="alert" {...props} />;
}

/** Loading state: skeletons only while data is genuinely being fetched. */
export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Skeleton width="60%" height={20} />
      <Skeleton width="80%" height={14} />
      <Skeleton width="50%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  centerText: { textAlign: 'center' },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
