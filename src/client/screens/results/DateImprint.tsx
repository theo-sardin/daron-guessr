import { fakeDateStamp, Stamp } from '../../components/Stamp';
import { cn } from '../../lib/util';

/**
 * The camera's date imprint for the small prints of this screen (album, award photos, your
 * photos). Polaroid's own `dateStamp` is sized for big prints: on a 80-120px photo it would cover
 * the whole bottom edge, so this one is scaled to the print (about a third of its width).
 */
export function DateImprint({ id, className }: { id: string; className?: string }) {
  return (
    <span className={cn('pointer-events-none absolute leading-none', className)} aria-hidden>
      <Stamp size="xs" valueClassName="stamp-on-photo text-[0.5625rem]! tracking-[0.04em]! sm:text-[0.625rem]!">
        {fakeDateStamp(id)}
      </Stamp>
    </span>
  );
}
