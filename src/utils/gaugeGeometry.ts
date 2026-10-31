/**
 * Gauge geometry shared by the onboarding hero now and the cockpit gauges later.
 * Angles are degrees from +x, increasing clockwise on screen. The dial sweeps 240 degrees,
 * from bottom-left (150) over the top (270) to bottom-right (390, i.e. 30).
 * Functions marked 'worklet' can run on the UI thread inside Reanimated animated props.
 */
export const GAUGE_START_DEG = 150;
export const GAUGE_SWEEP_DEG = 240;

/** t is a 0..1 fraction of the dial; out-of-range values are clamped. */
export function valueToAngle(t: number): number {
  'worklet';
  const clamped = Math.min(1, Math.max(0, t));
  return GAUGE_START_DEG + GAUGE_SWEEP_DEG * clamped;
}

export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const fixed = (n: number) => n.toFixed(2);

/** SVG arc path between two fractions of the dial. */
export function arcPath(cx: number, cy: number, r: number, fromT: number, toT: number): string {
  const a0 = valueToAngle(fromT);
  const a1 = valueToAngle(toT);
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${fixed(s.x)} ${fixed(s.y)} A ${r} ${r} 0 ${largeArc} 1 ${fixed(e.x)} ${fixed(e.y)}`;
}

export function tickLine(cx: number, cy: number, rInner: number, rOuter: number, t: number) {
  const a = valueToAngle(t);
  const p1 = polar(cx, cy, rInner, a);
  const p2 = polar(cx, cy, rOuter, a);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}
