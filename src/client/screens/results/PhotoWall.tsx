import type { PhotoResult, PublicPlayer } from '../../../shared/protocol';
import { Icon } from '../../components/Icon';
import { Polaroid } from '../../components/Polaroid';
import { Stamp } from '../../components/Stamp';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { DateImprint } from './DateImprint';
import { playerOr, tiltOf } from './helpers';

/**
 * Every photo of the game as an album of prints: slight tilts, a handwritten caption on each
 * ("Paul's mom"), the camera's date imprint, how many people found it as a lit stamp, and a
 * check / cross sticker for the viewer's own guess.
 */
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
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-1 pt-2 min-[360px]:grid-cols-3 min-[360px]:gap-x-3 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-5">
      {photos.map((p, i) => {
        const owner = playerOr(players, p.ownerId);
        const caption = t(`common.possessive.${p.photo.kind}`, { name: owner.name });
        const mine = p.ownerId === meId;
        const guessed = !mine && p.myVote !== null ? p.myVote === p.ownerId : null;
        return (
          <Polaroid
            key={p.photo.id}
            src={p.photo.url}
            alt={caption}
            tilt={tiltOf(p.photo.id, 4)}
            className="w-full p-2! pb-1.5! shadow-pop-sm!"
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.06, rotate: 0, zIndex: 2 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: (i % 5) * 0.05 }}
            caption={<span className="line-clamp-2 block text-xl leading-[0.95] sm:text-[1.375rem]">{caption}</span>}
            overlay={
              <>
                {/* A real button over the photo, so the lightbox also opens from the keyboard. */}
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="absolute inset-0 cursor-zoom-in rounded-sm focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-sun"
                  aria-label={caption}
                />
                <DateImprint id={p.photo.id} className="right-1.5 bottom-1.5" />
                <span className="pointer-events-none absolute top-1.5 right-1.5 flex rounded-md bg-ink/85 px-1.5 py-1 ring-1 ring-white/15">
                  <Stamp size="xs" ariaLabel={t('results.wall.badgeAria', { correct: p.correctVotes, total: p.totalVotes })}>
                    {t('results.wall.badge', { correct: p.correctVotes, total: p.totalVotes })}
                  </Stamp>
                </span>
                {guessed !== null && (
                  <span
                    className={cn(
                      'pointer-events-none absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full border-2 border-ink',
                      guessed ? 'bg-mint text-ink' : 'bg-danger text-white',
                    )}
                    title={guessed ? t('results.wall.youGotIt') : t('results.wall.youMissed')}
                  >
                    <Icon name={guessed ? 'check' : 'x'} weight="bold" className="size-3.5" label={guessed ? t('results.wall.youGotIt') : t('results.wall.youMissed')} />
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
