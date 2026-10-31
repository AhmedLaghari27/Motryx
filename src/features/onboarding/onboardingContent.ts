import type { IconName } from '@/components/Icon';

export type OnboardingPage = {
  id: 'welcome' | 'adapter' | 'safety';
  hero: 'gauge' | IconName;
  title: string;
  body: string;
  points: { icon: IconName; text: string }[];
};

/** All onboarding copy lives here so it can be reviewed and tested in one place. */
export const ONBOARDING_PAGES: readonly OnboardingPage[] = [
  {
    id: 'welcome',
    hero: 'gauge',
    title: 'Your car, in real numbers',
    body: 'Motryx turns your phone into a live instrument cluster, using real data from your car.',
    points: [
      { icon: 'cockpit', text: 'Build a cockpit of the gauges you care about.' },
      { icon: 'diagnostics', text: 'Read fault codes and readiness status.' },
      { icon: 'shield', text: 'Nothing is guessed. If your car does not report a value, Motryx says so.' },
    ],
  },
  {
    id: 'adapter',
    hero: 'adapter',
    title: 'You need an OBD-II adapter',
    body: 'Plug an adapter into your car’s OBD-II port, usually under the dashboard. Motryx talks to it over Bluetooth or Wi-Fi.',
    points: [
      { icon: 'adapter', text: 'Bluetooth LE and Wi-Fi adapters work on iPhone and Android.' },
      { icon: 'bluetooth', text: 'iPhone cannot use classic Bluetooth adapters. Check which type you have.' },
      { icon: 'live', text: 'Not every car reports every sensor. Motryx marks the rest as unsupported.' },
    ],
  },
  {
    id: 'safety',
    hero: 'shield',
    title: 'Drive safely. Your data stays yours.',
    body: 'A few things to know before you start.',
    points: [
      { icon: 'alert', text: 'Use performance tests only on a closed course where it is legal.' },
      { icon: 'alert', text: 'Never use your phone while driving. Set everything up before you move.' },
      {
        icon: 'location',
        text: 'Your data stays on this phone. Motryx asks for Bluetooth and location only when a feature needs them.',
      },
    ],
  },
];
