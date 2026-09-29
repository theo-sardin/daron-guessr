import type { ReactNode } from 'react';
import type { IconName } from '../../components/Icon';
import { IconBadge, type IconBadgeTone } from '../../components/IconBadge';
import { cn } from '../../lib/util';

/** Heading of a lobby card: a small icon sticker (the card's one accent) + the title. */
export function CardTitle({
  icon,
  tone,
  tilt = -6,
  children,
  className,
}: {
  icon: IconName;
  tone: IconBadgeTone;
  tilt?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('flex min-w-0 items-center gap-2.5 font-display text-2xl leading-none tracking-[-0.02em]', className)}>
      <IconBadge name={icon} tone={tone} size="sm" tilt={tilt} />
      <span className="min-w-0">{children}</span>
    </h2>
  );
}
