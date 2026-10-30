import type { ReadingStatus } from '@/types/telemetry';
import type { ThemeColors } from './tokens';

export function statusColor(colors: ThemeColors, status: ReadingStatus): string {
  switch (status) {
    case 'live':
      return colors.live;
    case 'stale':
      return colors.stale;
    case 'unsupported':
      return colors.unsupported;
    case 'unknown':
      return colors.textSecondary;
    case 'error':
      return colors.error;
  }
}
