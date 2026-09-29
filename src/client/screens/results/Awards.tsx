import { motion, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { Award, PhotoResult, PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { useI18n, type I18n } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn } from '../../lib/util';
import { AWARD_TONE, awardEmoji, awardFlavor, joinNames, playerOr, seedOf, tiltOf, type Flavor } from './helpers';

type PlayerAwardId = 'sherlock' | 'needsGlasses' | 'carbonCopy' | 'masterOfDisguise' | 'doppelganger';

interface AwardCopy {
  title: string;
  text: string;
  stat: string;
}

/**
 * Title, funny description and headline stat of an award, in the current language.
 * `flavor` is the award's own flavor (see `awardFlavor`).
 */
export function awardCopy(
  award: Award,
  { t, tpick }: Pick<I18n, 't' | 'tpick'>,
  players: Map<string, PublicPlayer>,
  photos: Map<string, PhotoResult>,
  seed: string,
  flavor: Flavor,
): AwardCopy {
  const winners = award.playerIds.map((id) => playerOr(players, id));
  const names = joinNames(
    winners.map((p) => p.name),
    t('results.and'),
  );
  const s = seedOf(seed, award.id);
  const title = t(`results.awards.${award.id}.title.${flavor}`);
  const stat = t(`results.awards.stat.${award.id}`, { value: award.value, total: award.total ?? '?' });
  const vars = { names, value: award.value, total: award.total ?? '?' };

  switch (award.id) {
    case 'mostConfusing': {
      const photo = award.photoId ? photos.get(award.photoId) : undefined;
      const kind = photo?.photo.kind ?? 'daron';
      const possessive = t(`common.possessive.${kind}`, { name: winners[0]?.name ?? '' });
      return { title, stat, text: tpick('results.awards.mostConfusing.text', s, { ...vars, possessive }) };
    }
    case 'biggestMixup': {
      const photo = award.photoId ? photos.get(award.photoId) : undefined;
      const kind = photo?.photo.kind ?? 'daron';
      // {possessive} for relatives ("Paul's mom"), {names} (the owner) for kid / pick photos.
      const possessive = t(`results.awards.possessiveMid.${kind}`, { name: winners[0]?.name ?? '' });
      const other = award.otherPlayerId ? playerOr(players, award.otherPlayerId).name : '???';
      return { title, stat, text: tpick(`results.awards.biggestMixup.${kind}`, s, { ...vars, possessive, other }) };
    }
    default: {
      const id: PlayerAwardId = award.id;
      const plural = winners.length > 1 ? 'many' : 'one';
      return { title, stat, text: tpick(`results.awards.${id}.${flavor}.${plural}`, s, vars) };
    }
  }
}

function WinnerChip({ player, isMe }: { player: PublicPlayer; isMe: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border-2 border-ink py-0.5 pr-2.5 pl-0.5 text-sm font-extrabold text-ink',
        isMe ? 'bg-sun' : 'bg-white/85',
      )}
    >
      <Avatar player={player} size="xs" crown={false} dimOffline={false} />
      <span className="truncate">{player.name}</span>
    </span>
  );
}

function PhotoThumb({ photo, caption, onOpen }: { photo: PhotoResult; caption: string; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.94 }}
      whileHover={{ rotate: 0, scale: 1.04 }}
      className="relative block shrink-0 rounded-md border-3 border-ink bg-white p-1.5 shadow-pop-sm"
      style={{ rotate: tiltOf(photo.photo.id, 6) }}
      aria-label={caption}
    >
      <img src={photo.photo.url} alt={t('results.awards.photoOf')} className="block size-20 rounded-sm object-cover sm:size-24" draggable={false} />
    </motion.button>
  );
}

function AwardCard({
  award,
  index,
  wide,
  ready,
  players,
  photos,
  meId,
  seed,
  flavor,
  onOpenPhoto,
}: {
  award: Award;
  index: number;
  /** Spans both columns (odd one out at the end). */
  wide: boolean;
  ready: boolean;
  players: Map<string, PublicPlayer>;
  photos: Map<string, PhotoResult>;
  meId: string;
  seed: string;
  /** This award's flavor. */
  flavor: Flavor;
  onOpenPhoto: (photo: PhotoResult) => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const show = ready && inView;
  const copy = awardCopy(award, i18n, players, photos, seed, flavor);
  const tone = AWARD_TONE[award.id];
  const photo = award.photoId ? photos.get(award.photoId) : undefined;
  const winners = award.playerIds.map((id) => playerOr(players, id));
  const other = award.otherPlayerId ? playerOr(players, award.otherPlayerId) : null;
  const delay = (index % 2) * 0.12;

  const played = useRef(false);
  useEffect(() => {
    if (!show || played.current) return;
    played.current = true;
    const id = window.setTimeout(() => sfx.play('pop'), (delay + 0.15) * 1000);
    return () => window.clearTimeout(id);
  }, [show, delay]);

  return (
    <div ref={ref} style={{ perspective: 900 }} className={cn(wide && 'sm:col-span-2')}>
      <Card
        tone={tone}
        padded={false}
        className={cn('relative h-full p-4', tone === 'pink' && 'text-ink!')}
        initial={{ opacity: 0, rotateY: -85, scale: 0.85, y: 30 }}
        animate={show ? { opacity: 1, rotateY: 0, scale: 1, y: 0 } : undefined}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl border-3 border-ink bg-white text-4xl shadow-pop-sm"
            initial={{ rotate: -8, scale: 0.4 }}
            animate={show ? { rotate: [-8, -22, 16, -10, 4, -6], scale: [0.4, 1.25, 1, 1, 1, 1] } : undefined}
            transition={{ type: 'tween', duration: 0.9, delay: delay + 0.3, ease: 'easeOut' }}
            aria-hidden
          >
            {awardEmoji(award.id, flavor)}
          </motion.div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl leading-tight">{copy.title}</h3>
            <span className="mt-1 inline-block rounded-full bg-ink px-2.5 py-0.5 font-display text-sm tracking-wide whitespace-nowrap text-cream">
              {copy.stat}
            </span>
          </div>
        </div>

        {photo && (
          <div className="mt-3 flex items-center gap-3">
            <PhotoThumb
              photo={photo}
              caption={t(`common.possessive.${photo.photo.kind}`, { name: playerOr(players, photo.ownerId).name })}
              onOpen={() => onOpenPhoto(photo)}
            />
            {award.id === 'biggestMixup' && other && (
              <div className="flex min-w-0 items-center gap-2">
                <motion.span
                  className="text-3xl"
                  aria-hidden
                  animate={show ? { x: [0, 6, 0] } : undefined}
                  transition={{ type: 'tween', duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.8 }}
                >
                  👉
                </motion.span>
                <span className="relative flex min-w-0 flex-col items-center gap-1">
                  <Avatar player={other} size="lg" crown={false} dimOffline={false} />
                  <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-white font-display text-base text-ink">
                    ?
                  </span>
                  <span className="max-w-24 truncate text-sm font-extrabold">{other.name}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 leading-snug font-semibold opacity-90">{copy.text}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {winners.map((p) => (
            <WinnerChip key={p.id} player={p} isMe={p.id === meId} />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function Awards({
  awards,
  players,
  photos,
  meId,
  seed,
  flavor,
  ready,
  onOpenPhoto,
}: {
  awards: Award[];
  players: Map<string, PublicPlayer>;
  photos: Map<string, PhotoResult>;
  meId: string;
  seed: string;
  /** The game's flavor. */
  flavor: Flavor;
  ready: boolean;
  onOpenPhoto: (photo: PhotoResult) => void;
}) {
  const { t } = useI18n();
  if (awards.length === 0) {
    return (
      <Card tone="glass" className="text-center font-semibold">
        {t('results.awards.none')}
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {awards.map((award, i) => (
        <AwardCard
          key={`${award.id}-${i}`}
          award={award}
          index={i}
          wide={awards.length % 2 === 1 && i === awards.length - 1}
          ready={ready}
          players={players}
          photos={photos}
          meId={meId}
          seed={seed}
          flavor={awardFlavor(award, [...photos.values()], flavor)}
          onOpenPhoto={onOpenPhoto}
        />
      ))}
    </div>
  );
}
