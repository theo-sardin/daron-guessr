import type { CSSProperties, ReactNode, SVGProps } from 'react';
import { cn } from '../lib/util';

/**
 * The game's own icon set: 24x24, currentColor, 2.25px rounded strokes and a few solid
 * details, drawn to match the chunky ink-outline stickers. Shapes marked with `B` (body)
 * take the optional `fill` color, so an icon can be two-tone (e.g. an ink crown filled
 * with sun yellow): <Icon name="crown" fill="var(--color-sun)" />.
 */

const B = 'var(--icon-fill, none)';
/** A solid detail in the stroke color. */
const dot = (cx: number, cy: number, r = 1.3) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

/** Points of a star centered on (cx, cy). */
function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5): string {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

const ICONS = {
  camera: (
    <>
      <path d="M8 7.2 9.3 4.9A1.6 1.6 0 0 1 10.7 4h2.6a1.6 1.6 0 0 1 1.4.9L16 7.2" />
      <rect x="2.5" y="7.2" width="19" height="13.3" rx="3.2" fill={B} />
      <circle cx="12" cy="13.8" r="3.7" />
      {dot(18, 10.4, 1.15)}
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" fill={B} />
      <path d="m3.6 17.4 4.6-4.6a1.5 1.5 0 0 1 2.1 0l6.9 6.9" />
      <path d="m14 16.4 1.7-1.7a1.5 1.5 0 0 1 2.1 0l2.6 2.6" />
      {dot(15.7, 8.9, 1.85)}
    </>
  ),
  images: (
    <>
      <path d="M6.5 4.3h11.2a3 3 0 0 1 3 3v9.4" />
      <rect x="2.8" y="7.5" width="14.7" height="13" rx="2.7" fill={B} />
      <path d="m3.3 17.9 3.6-3.6a1.4 1.4 0 0 1 2 0l5.7 5.7" />
      {dot(13, 11.6, 1.6)}
    </>
  ),
  upload: (
    <>
      <path d="M12 15.2V4.2" />
      <path d="M7.4 8.6 12 4l4.6 4.6" />
      <path d="M3.8 14.3v2.9a3.3 3.3 0 0 0 3.3 3.3h9.8a3.3 3.3 0 0 0 3.3-3.3v-2.9" />
    </>
  ),
  plus: <path d="M12 4.8v14.4M4.8 12h14.4" />,
  minus: <path d="M4.8 12h14.4" />,
  swap: (
    <>
      <path d="M4 8.2h15" />
      <path d="m15.4 4.5 3.7 3.7-3.7 3.7" />
      <path d="M20 15.8H5" />
      <path d="m8.6 12.1-3.7 3.7 3.7 3.7" />
    </>
  ),
  trash: (
    <>
      <path d="M3.8 6.4h16.4" />
      <path d="M9.3 6.4V4.9a1.4 1.4 0 0 1 1.4-1.4h2.6a1.4 1.4 0 0 1 1.4 1.4v1.5" />
      <path d="m5.9 6.4.95 12.3a2 2 0 0 0 2 1.8h6.3a2 2 0 0 0 2-1.8l.95-12.3" fill={B} />
      <path d="M10 10.4v6M14 10.4v6" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.6 13.1A7.8 7.8 0 1 1 17.3 6.3" />
      <path d="M18.6 2.9v4.3h-4.3" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.6v10.6" />
      <path d="M8.1 7.4 12 3.5l3.9 3.9" />
      <path d="M8.4 10.3H7.2a2.7 2.7 0 0 0-2.7 2.7v4.8a2.7 2.7 0 0 0 2.7 2.7h9.6a2.7 2.7 0 0 0 2.7-2.7V13a2.7 2.7 0 0 0-2.7-2.7h-1.2" />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1" />
      <path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="6" y="6" width="2" height="2" rx=".4" fill="currentColor" stroke="none" />
      <rect x="16" y="6" width="2" height="2" rx=".4" fill="currentColor" stroke="none" />
      <rect x="6" y="16" width="2" height="2" rx=".4" fill="currentColor" stroke="none" />
      <path d="M14 14h2.4v2.4M20 14v.1M14 20h.1M17.3 20H20v-2.7" />
    </>
  ),
  copy: (
    <>
      <path d="M15.5 8.5V6.2a2.7 2.7 0 0 0-2.7-2.7H6.2a2.7 2.7 0 0 0-2.7 2.7v6.6a2.7 2.7 0 0 0 2.7 2.7h2.3" />
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.7" fill={B} />
    </>
  ),
  check: <path d="m4.6 12.7 4.7 4.7L19.4 7.3" />,
  x: <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" />,
  'arrow-right': (
    <>
      <path d="M4.2 12h15" />
      <path d="m13.4 6.2 5.8 5.8-5.8 5.8" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19.8 12h-15" />
      <path d="M10.6 6.2 4.8 12l5.8 5.8" />
    </>
  ),
  'chevron-down': <path d="m5.8 9.2 6.2 6.2 6.2-6.2" />,
  'sound-on': (
    <>
      <path d="M3.6 10.1v3.8a1.2 1.2 0 0 0 1.2 1.2h2.7l4.3 3.7a.9.9 0 0 0 1.5-.7V5.9a.9.9 0 0 0-1.5-.7L7.5 8.9H4.8a1.2 1.2 0 0 0-1.2 1.2z" fill="currentColor" />
      <path d="M16.4 9.2a4 4 0 0 1 0 5.6" />
      <path d="M19 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  'sound-off': (
    <>
      <path d="M3.6 10.1v3.8a1.2 1.2 0 0 0 1.2 1.2h2.7l4.3 3.7a.9.9 0 0 0 1.5-.7V5.9a.9.9 0 0 0-1.5-.7L7.5 8.9H4.8a1.2 1.2 0 0 0-1.2 1.2z" fill="currentColor" />
      <path d="m16.4 9.6 4.8 4.8M21.2 9.6l-4.8 4.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" fill={B} />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.4c-2.4 2.3-3.6 5.2-3.6 8.6s1.2 6.3 3.6 8.6c2.4-2.3 3.6-5.2 3.6-8.6S14.4 5.7 12 3.4z" />
    </>
  ),
  leave: (
    <>
      <path d="M13.2 3.6H7a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h6.2" fill={B} />
      <path d="M10.4 12h10.2" />
      <path d="m17 8.3 3.7 3.7-3.7 3.7" />
    </>
  ),
  crown: (
    <>
      <path d="M4.3 9.6 8.2 13 12 6.8l3.8 6.2 3.9-3.4-1.5 9H5.8z" fill={B} />
      {dot(4, 7.3, 1.4)}
      {dot(12, 4.2, 1.4)}
      {dot(20, 7.3, 1.4)}
    </>
  ),
  star: <polygon points={starPoints(12, 12.6, 9, 4.1)} fill={B} />,
  trophy: (
    <>
      <path d="M7.4 3.8h9.2v5.5a4.6 4.6 0 0 1-9.2 0z" fill={B} />
      <path d="M7.4 5.8H4.6v1.3a3.4 3.4 0 0 0 3.2 3.4M16.6 5.8h2.8v1.3a3.4 3.4 0 0 1-3.2 3.4" />
      <path d="M12 13.9v3.3" />
      <path d="M8.2 20.5a3.3 3.3 0 0 1 3.3-3.3h1a3.3 3.3 0 0 1 3.3 3.3z" />
    </>
  ),
  medal: (
    <>
      <path d="m8.2 3.4 2.9 6.2M15.8 3.4l-2.9 6.2" />
      <circle cx="12" cy="15.2" r="5.4" fill={B} />
      <polygon points={starPoints(12, 15.4, 2.6, 1.15)} fill="currentColor" strokeWidth="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" fill={B} />
      <path d="M12 7.3V12l3.1 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.4" r="3.4" fill={B} />
      <path d="M3.2 19.8a5.8 5.8 0 0 1 11.6 0z" fill={B} />
      <path d="M15.4 5.2a3.4 3.4 0 0 1 0 6.5" />
      <path d="M17.6 14.3a5.8 5.8 0 0 1 3.2 5.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="4" fill={B} />
      <path d="M4.8 20.3a7.2 7.2 0 0 1 14.4 0z" fill={B} />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S5.9 5.6 12 5.6 21.6 12 21.6 12 18.1 18.4 12 18.4 2.4 12 2.4 12z" fill={B} />
      <circle cx="12" cy="12" r="2.7" fill="currentColor" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.6c6.1 0 9.6 6.4 9.6 6.4a16 16 0 0 1-2.2 3" />
      <path d="M6.6 7.2C3.9 8.9 2.4 12 2.4 12s3.5 6.4 9.6 6.4a9.4 9.4 0 0 0 4.9-1.4" />
      <path d="M10 10.2a2.7 2.7 0 0 0 3.8 3.8" />
      <path d="m3.6 3.6 16.8 16.8" />
    </>
  ),
  lock: (
    <>
      <path d="M7.8 10.6V8.1a4.2 4.2 0 0 1 8.4 0v2.5" />
      <rect x="4.5" y="10.6" width="15" height="9.9" rx="2.6" fill={B} />
      <path d="M12 14.4v2.3" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3.5 7.2h2.7c2.1 0 3.4 1 4.5 2.8l2.6 4.2c1.1 1.8 2.4 2.8 4.5 2.8h2.6" />
      <path d="M3.5 16.8h2.7c1.5 0 2.6-.5 3.5-1.4M14.3 8.6c.9-.9 2-1.4 3.5-1.4h2.6" />
      <path d="m17.6 4.3 2.9 2.9-2.9 2.9M17.6 13.9l2.9 2.9-2.9 2.9" />
    </>
  ),
  dice: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.2" fill={B} />
      {dot(8.3, 8.3, 1.55)}
      {dot(12, 12, 1.55)}
      {dot(15.7, 15.7, 1.55)}
    </>
  ),
  sparkle: (
    <>
      <path d="M10.2 5.2Q11.1 12 17.8 13Q11.1 14 10.2 20.8Q9.3 14 2.6 13Q9.3 12 10.2 5.2z" fill={B} />
      <path d="M18.3 3.2v4.2M16.2 5.3h4.2" />
    </>
  ),
  flash: <path d="M13.6 2.6 4.8 13.4h6.3l-1.2 8 8.9-11.2h-6.4z" fill={B} />,
  zoom: (
    <>
      <circle cx="10.4" cy="10.4" r="6.6" fill={B} />
      <path d="m15.3 15.3 5.2 5.2" />
      <path d="M10.4 7.9v5M7.9 10.4h5" />
    </>
  ),
  settings: (
    <>
      <path d="M3.8 7.4h8.4M18.8 7.4h1.4M3.8 16.6h1.4M11.8 16.6h8.4" />
      <circle cx="15.5" cy="7.4" r="2.6" fill={B} />
      <circle cx="8.5" cy="16.6" r="2.6" fill={B} />
    </>
  ),
  edit: (
    <>
      <path d="M4.2 19.8 5 15.6 15.4 5.2a2.2 2.2 0 0 1 3.1 0l.3.3a2.2 2.2 0 0 1 0 3.1L8.4 19z" fill={B} />
      <path d="m13.8 6.8 3.4 3.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" fill={B} />
      <path d="M12 11v5.2" />
      {dot(12, 7.7, 1.35)}
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.4a2 2 0 0 1 3.4 0l7.5 13a2 2 0 0 1-1.7 3H4.5a2 2 0 0 1-1.7-3z" fill={B} />
      <path d="M12 9.4v4.3" />
      {dot(12, 16.9, 1.35)}
    </>
  ),
  heart: (
    <path
      d="M12 20.1s-8.2-4.7-8.2-10.6a4.5 4.5 0 0 1 4.5-4.6c1.6 0 2.9.8 3.7 2.1.8-1.3 2.1-2.1 3.7-2.1a4.5 4.5 0 0 1 4.5 4.6c0 5.9-8.2 10.6-8.2 10.6z"
      fill={B}
    />
  ),
  film: (
    <>
      <rect x="3.6" y="3" width="16.8" height="18" rx="2.6" fill={B} />
      <path d="M8.2 3v18M15.8 3v18" />
      <path d="M3.6 7.6h4.6M3.6 12h4.6M3.6 16.4h4.6M15.8 7.6h4.6M15.8 12h4.6M15.8 16.4h4.6" />
    </>
  ),
  ballot: (
    <>
      <path d="M7.8 11.6V4.4a1 1 0 0 1 1-1h6.4a1 1 0 0 1 1 1v7.2" />
      <path d="m10.1 7.5 1.4 1.4 2.5-2.6" />
      <path d="M4.2 11.6h15.6v7.2a1.7 1.7 0 0 1-1.7 1.7H5.9a1.7 1.7 0 0 1-1.7-1.7z" fill={B} />
      <path d="M2.6 11.6h18.8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.6" fill={B} />
      <circle cx="12" cy="12" r="4.6" />
      {dot(12, 12, 1.5)}
    </>
  ),
  ghost: (
    <>
      <path d="M5 20.4V11a7 7 0 0 1 14 0v9.4l-2.3-1.7-2.4 1.7-2.3-1.7-2.3 1.7-2.4-1.7z" fill={B} />
      {dot(9.6, 11.2, 1.35)}
      {dot(14.4, 11.2, 1.35)}
    </>
  ),
  mask: (
    <path
      fillRule="evenodd"
      d="M2.6 8.4c3.2-1.3 6.3-1.2 9.4.6 3.1-1.8 6.2-1.9 9.4-.6 0 5.2-2 8.5-5.2 8.5-2 0-3-1.9-4.2-1.9s-2.2 1.9-4.2 1.9c-3.2 0-5.2-3.3-5.2-8.5zM6.4 11.9c.8-1.2 2.6-1.3 3.5 0-.9 1-2.6 1-3.5 0zM14.1 11.9c.9-1.3 2.7-1.2 3.5 0-.9 1-2.6 1-3.5 0z"
      fill={B}
    />
  ),
  hand: (
    <>
      <path
        d="M8.4 12.2V5.6a1.5 1.5 0 0 1 3 0v5.2V4.2a1.5 1.5 0 0 1 3 0v6.6V5.8a1.5 1.5 0 0 1 3 0v8.1l1-1.5a1.6 1.6 0 0 1 2.7 1.7l-2.6 4.3a6 6 0 0 1-5.1 2.9h-1.5a6 6 0 0 1-6-6v-2.2a1.5 1.5 0 0 1 3 0z"
        fill={B}
      />
    </>
  ),
  wifi: (
    <>
      <path d="M2.8 9.2a13.4 13.4 0 0 1 18.4 0" />
      <path d="M6 12.6a8.8 8.8 0 0 1 12 0" />
      <path d="M9.2 16a4.3 4.3 0 0 1 5.6 0" />
      {dot(12, 19.4, 1.5)}
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2.8" width="12" height="18.4" rx="2.8" fill={B} />
      <path d="M10.6 17.8h2.8" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill' | 'name'> {
  name: IconName;
  /** CSS color for the icon's body (two-tone icons). Defaults to none (outline only). */
  fill?: string;
  /** Accessible label; without it the icon is decorative (aria-hidden). */
  label?: string;
  /** Stroke width in viewBox units (default 2.25). */
  strokeWidth?: number;
}

/** <Icon name="camera" className="size-5" />: sizes with the font by default (1em). */
export function Icon({ name, fill, label, strokeWidth = 2.25, className, style, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('icon', className)}
      style={fill ? ({ '--icon-fill': fill, ...style } as CSSProperties) : style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
