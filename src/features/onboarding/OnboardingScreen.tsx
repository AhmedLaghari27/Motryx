import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { Button, Icon, Screen, Text } from '@/components';
import { useOnboardingStore } from '@/state/onboarding.store';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, spacing } from '@/theme/tokens';
import { GaugeHero } from './GaugeHero';
import { ONBOARDING_PAGES } from './onboardingContent';
import { PageIndicator } from './PageIndicator';

const LAST = ONBOARDING_PAGES.length - 1;

export function OnboardingScreen() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const complete = useOnboardingStore((s) => s.complete);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const page = ONBOARDING_PAGES[index];
  if (!page) return null;
  const isLast = index === LAST;

  const goTo = (next: number, dir: 'forward' | 'back') => {
    setDirection(dir);
    setIndex(next);
  };

  const entering = reduce
    ? undefined
    : (direction === 'forward' ? FadeInRight : FadeInLeft).duration(motion.duration.standard);

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.screen}>
      <View style={styles.topRow}>
        {!isLast ? (
          <Button
            label="Skip intro"
            variant="ghost"
            onPress={() => goTo(LAST, 'forward')}
            accessibilityHint="Jump to safety and privacy information"
          />
        ) : null}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={page.id} entering={entering} style={styles.page}>
          {page.hero === 'gauge' ? (
            <GaugeHero />
          ) : (
            <View style={[styles.heroIcon, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <Icon name={page.hero} size={44} color={colors.accent} />
            </View>
          )}

          <Text variant="headline" accessibilityRole="header" style={styles.center}>
            {page.title}
          </Text>
          <Text tone="secondary" style={styles.center}>
            {page.body}
          </Text>

          <View style={styles.points}>
            {page.points.map((point) => (
              <View key={point.text} style={styles.point}>
                <Icon name={point.icon} size={22} color={colors.accent} />
                <Text style={styles.pointText}>{point.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <PageIndicator count={ONBOARDING_PAGES.length} index={index} />
        <View style={styles.buttons}>
          {index > 0 ? (
            <Button label="Back" variant="secondary" onPress={() => goTo(index - 1, 'back')} style={styles.flex} />
          ) : null}
          <Button
            label={isLast ? 'Get started' : 'Next'}
            onPress={() => (isLast ? void complete() : goTo(index + 1, 'forward'))}
            style={styles.primary}
          />
        </View>
        {isLast ? (
          <Text variant="caption" tone="secondary" style={styles.center}>
            By continuing, you confirm you have read this.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: spacing.xl, gap: spacing.lg },
  topRow: { minHeight: 48, alignItems: 'flex-end', justifyContent: 'center' },
  pageContent: { flexGrow: 1, justifyContent: 'center' },
  page: { alignItems: 'center', gap: spacing.lg },
  center: { textAlign: 'center' },
  heroIcon: {
    width: 120,
    height: 120,
    borderRadius: radius.hero,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  points: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pointText: { flex: 1 },
  footer: { gap: spacing.lg },
  buttons: { flexDirection: 'row', gap: spacing.md },
  primary: { flex: 2 },
});
