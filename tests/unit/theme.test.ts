import { contrastRatio } from '@/theme/contrast';
import { colorsByMode, type ThemeMode } from '@/theme/tokens';

describe('contrastRatio', () => {
  it('matches known values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe.each<ThemeMode>(['night', 'daylight'])('%s theme accessibility', (mode) => {
  const c = colorsByMode[mode];

  it('keeps body text readable (4.5:1) on every surface', () => {
    for (const surface of [c.bg, c.surface, c.surfaceRaised]) {
      expect(contrastRatio(c.textPrimary, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textSecondary, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps status colors and accent distinguishable (3:1) on bg and surface', () => {
    for (const color of [c.accent, c.live, c.warn, c.error, c.stale, c.unsupported]) {
      for (const surface of [c.bg, c.surface]) {
        expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('keeps button labels readable on the accent', () => {
    expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onAccent, c.error)).toBeGreaterThanOrEqual(4.5);
  });
});
