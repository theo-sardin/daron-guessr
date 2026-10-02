import type { PhotoResult, PublicPlayer } from '../../../shared/protocol';
import { Polaroid } from '../../components/Polaroid';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { playerOr, shareTone, tiltOf } from './helpers';

/** Every photo of the game, tilted polaroids with owner and how many people found it. */
export function PhotoWall({
  photos,
  players,
  meId,
  onOpen,
}: {
  photos: PhotoResult[];
  players: Map<string, PublicPlayer>;
  meId: string;
  onOpen: (photo: PhotoResult) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-5 pt-2 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-5">
      {photos.map((p, i) => {
        const owner = playerOr(players, p.ownerId);
        const caption = t(`common.possessive.${p.photo.kind}`, { name: owner.name });
        const mine = p.ownerId === meId;
        const guessed = !mine && p.myVote !== null ? p.myVote === p.ownerId : null;
        const guess = guessed ? t('results.wall.youGotIt') : t('results.wall.youMissed');
        return (
          <Polaroid
            key={p.photo.id}
            src={p.photo.url}
            // Also the name of the (keyboard openable) photo: whose it is, how many found it, your guess.
            alt={[t('results.wall.lightbox', { caption, correct: p.correctVotes, total: p.totalVotes }), guessed !== null && guess]
              .filter(Boolean)
              .join(' · ')}
            tilt={tiltOf(p.photo.id, 6)}
            onOpen={() => onOpen(p)}
            className="w-full p-1.5! pb-2! [&>span:first-child]:-top-2 [&>span:first-child]:h-4 [&>span:first-child]:w-10"
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.06, zIndex: 2 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: (i % 5) * 0.05 }}
            caption={
              <span className="flex items-center justify-center gap-1">
                <span
                  className="size-2.5 shrink-0 rounded-full border border-ink"
                  style={{ backgroundColor: owner.color }}
                  aria-hidden
                />
                <span className="line-clamp-2 text-xs leading-tight sm:text-sm">{caption}</span>
              </span>
            }
            overlay={
              <>
                <span
                  className={cn(
                    'pointer-events-none absolute top-1 right-1 rounded-full border-2 border-ink px-1.5 py-px font-display text-[11px] leading-tight whitespace-nowrap shadow-[0_2px_0_0_var(--color-ink)] sm:text-xs',
                    shareTone(p),
                  )}
                >
                  {t('results.wall.badge', { correct: p.correctVotes, total: p.totalVotes })}
                </span>
                {guessed !== null && (
                  <span
                    className={cn(
                      'pointer-events-none absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full border-2 border-ink text-xs font-black',
                      guessed ? 'bg-mint text-ink' : 'bg-danger text-white',
                    )}
                    title={guess}
                    aria-hidden
                  >
                    {guessed ? '✓' : '✗'}
                  </span>
                )}
              </>
            }
          />
        );
      })}
    </div>
  );
}
