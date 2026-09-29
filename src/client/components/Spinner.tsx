import { useT } from '../i18n';
import { cn } from '../lib/util';

/** Six iris blades: each one extends an edge of the inner hexagon out to the lens barrel. */
const R = 9.4;
const r = 4.1;
const BLADES = Array.from({ length: 6 }, (_, k) => {
  const a0 = (Math.PI / 3) * k - Math.PI / 2;
  const a1 = a0 + Math.PI / 3;
  const p0 = [12 + r * Math.cos(a0), 12 + r * Math.sin(a0)];
  const p1 = [12 + r * Math.cos(a1), 12 + r * Math.sin(a1)];
  const d = [p1[0] - p0[0], p1[1] - p0[1]];
  const len = Math.hypot(d[0], d[1]);
  const u = [d[0] / len, d[1] / len];
  // Walk from p0 along u until the barrel (|p - c| = R).
  const px = p0[0] - 12;
  const py = p0[1] - 12;
  const b = px * u[0] + py * u[1];
  const t = -b + Math.sqrt(b * b - (px * px + py * py - R * R));
  const end = [p0[0] + u[0] * t, p0[1] + u[1] * t];
  return `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}L${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
}).join('');

/** Camera iris spinning in shutter beats. Sized and colored by className (default size-6). */
export function Spinner({ className }: { className?: string }) {
  const t = useT();
  return (
    <span role="status" aria-label={t('common.loading')} className={cn('inline-block size-6 shrink-0', className)}>
      <svg
        viewBox="0 0 24 24"
        className="block size-full animate-aperture"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r={R} />
        <path d={BLADES} />
      </svg>
    </span>
  );
}
