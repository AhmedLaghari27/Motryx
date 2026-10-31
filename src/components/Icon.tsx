import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export type IconName =
  | 'cockpit'
  | 'live'
  | 'diagnostics'
  | 'garage'
  | 'settings'
  | 'alert'
  | 'inbox'
  | 'bluetooth'
  | 'location'
  | 'shield'
  | 'adapter'
  | 'check';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

/** Small stroke icon set drawn with SVG, so the app needs no icon font dependency. */
export function Icon({ name, size = 24, color, strokeWidth = 1.8 }: Props) {
  const { colors } = useTheme();
  const stroke = color ?? colors.textPrimary;
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  let shapes: React.ReactNode;
  switch (name) {
    case 'cockpit':
      shapes = (
        <>
          <Path d="M4 17a8 8 0 1 1 16 0" {...common} />
          <Path d="M12 17l4-5" {...common} />
          <Circle cx="12" cy="17" r="1" {...common} />
        </>
      );
      break;
    case 'live':
      shapes = <Path d="M3 12h4l2.5-6 4 12 2.5-6H21" {...common} />;
      break;
    case 'diagnostics':
      shapes = (
        <>
          <Path d="M7 4h10a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" {...common} />
          <Path d="M9 12l2 2 4-4" {...common} />
        </>
      );
      break;
    case 'garage':
      shapes = (
        <>
          <Path d="M3 15.5v-3L5 8h14l2 4.5v3z" {...common} />
          <Path d="M3 12.5h18" {...common} />
          <Circle cx="7" cy="17.5" r="1.5" {...common} />
          <Circle cx="17" cy="17.5" r="1.5" {...common} />
        </>
      );
      break;
    case 'settings':
      shapes = (
        <>
          <Path d="M4 8h9M17 8h3M4 16h3M11 16h9" {...common} />
          <Circle cx="15" cy="8" r="2" {...common} />
          <Circle cx="9" cy="16" r="2" {...common} />
        </>
      );
      break;
    case 'alert':
      shapes = (
        <>
          <Path d="M12 4l9 16H3z" {...common} />
          <Path d="M12 10v4M12 17.2v.01" {...common} />
        </>
      );
      break;
    case 'bluetooth':
      shapes = <Path d="M6.5 7.5l11 9-5.5 4.5V3l5.5 4.5-11 9" {...common} />;
      break;
    case 'location':
      shapes = (
        <>
          <Path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.6 12 21 12 21z" {...common} />
          <Circle cx="12" cy="10.5" r="2.3" {...common} />
        </>
      );
      break;
    case 'shield':
      shapes = (
        <>
          <Path d="M12 3l7 3v5.5c0 4.4-3 7.6-7 9.5-4-1.9-7-5.1-7-9.5V6z" {...common} />
          <Path d="M9 12l2.2 2.2L15.5 10" {...common} />
        </>
      );
      break;
    case 'adapter':
      shapes = (
        <>
          <Path d="M5 7h14v6l-2 4H7l-2-4z" {...common} />
          <Path d="M9.5 10h.01M12 10h.01M14.5 10h.01M12 17v4" {...common} />
        </>
      );
      break;
    case 'check':
      shapes = <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} />;
      break;
    case 'inbox':
      shapes = (
        <>
          <Path d="M4 13l2-7h12l2 7v5H4z" {...common} />
          <Path d="M4 13h5l1 2h4l1-2h5" {...common} />
        </>
      );
      break;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shapes}
    </Svg>
  );
}
