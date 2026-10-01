import type { PhotoResult, PublicPlayer } from '../../../shared/protocol';
import { Annotation, MarkerCheck } from '../../components/Marker';
import { Polaroid } from '../../components/Polaroid';
import type { TapeTone } from '../../components/Tape';
import { TornPaper } from '../../components/TornPaper';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n';
import { playerOr, tiltOf } from './helpers';

const TAPES: TapeTone[] = ['cream', 'yellow', 'pink', 'cream', 'mint', 'blue'];

/**
 * Every photo of the game as a scrapbook page: polaroids taped on kraft paper, a handwritten
 * caption on each ("Paul's mom"), how many people found it scribbled in red marker ("3/4 ✓"),
 * and the viewer's own guess checked (or crossed) in the corner.
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
    <TornPaper surface="kraft" edges="tblr" amp={4} seed="wall" tilt={0.5} className="px-3 pt-7 pb-8 sm:px-6">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-9 min-[400px]:grid-cols-3 sm:gap-x-6 md:grid-cols-4">
        {photos.map((p, i) => {
          const owner = playerOr(players, p.ownerId);
          const caption = t(`common.possessive.${p.photo.kind}`, { name: owner.name });
          const mine = p.ownerId === meId;
          const guessed = !mine && p.myVote !== null ? p.myVote === p.ownerId : null;
          return (
            <li key={p.photo.id} className="relative">
              <Polaroid
                src={p.photo.url}
                alt={caption}
                tilt={tiltOf(p.photo.id, 4)}
                tape={TAPES[i % TAPES.length]}
                className="w-full p-2! pb-1.5!"
                initial={{ opacity: 0, scale: 0.6, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05, rotate: 0, zIndex: 2 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: (i % 4) * 0.05 }}
                caption={<span className="line-clamp-2 block text-[1.3rem] leading-[0.95] sm:text-[1.4rem]">{caption}</span>}
                overlay={
                  <>
                    {/* A real button over the photo, so the lightbox also opens from the keyboard. */}
                    <button
                      type="button"
                      onClick={() => onOpen(p)}
                      className="absolute inset-0 cursor-zoom-in focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-yellow"
                      aria-label={caption}
                    />
                    {guessed !== null && (
                      <span
                        className="pointer-events-none absolute top-1 left-1 flex size-8 items-center justify-center rounded-full bg-sheet/90 shadow-paper-sm"
                        role="img"
                        aria-label={guessed ? t('results.wall.youGotIt') : t('results.wall.youMissed')}
                        title={guessed ? t('results.wall.youGotIt') : t('results.wall.youMissed')}
                      >
                        {guessed ? <MarkerCheck tone="blue" className="size-5" strokeWidth={4} /> : <Icon name="x" weight="bold" className="size-5 text-red-ink" />}
                      </span>
                    )}
                  </>
                }
              />
              {/* How many found it, scribbled on the page */}
              <span
                className="pointer-events-none absolute -right-2 -bottom-6 z-10 rounded-[3px] bg-sheet/85 px-1.5 shadow-paper-sm"
                style={{ rotate: `${tiltOf(`${p.photo.id}-s`, 6)}deg` }}
                role="img"
                aria-label={t('results.wall.badgeAria', { correct: p.correctVotes, total: p.totalVotes })}
              >
                <Annotation size={18} animate={false}>
                  {t('results.wall.badge', { correct: p.correctVotes, total: p.totalVotes })}
                </Annotation>
              </span>
            </li>
          );
        })}
      </ul>
    </TornPaper>
  );
}
