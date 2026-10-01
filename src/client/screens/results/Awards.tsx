import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import type { Award, PhotoResult, PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Annotation } from '../../components/Marker';
import { NotebookCard, Paper } from '../../components/Paper';
import { Polaroid } from '../../components/Polaroid';
import { RubberStamp } from '../../components/RubberStamp';
import { Tape } from '../../components/Tape';
import type { PaperSurface } from '../../components/TornPaper';
import { useI18n, type I18n } from '../../i18n';
import { cn } from '../../lib/util';
import { AWARD_PAPER, awardFlavor, capitalize, joinNames, playerOr, seedOf, tiltOf, type Flavor } from './helpers';

type PlayerAwardId = 'sherlock' | 'needsGlasses' | 'carbonCopy' | 'masterOfDisguise' | 'doppelganger';

interface AwardCopy {
  title: string;
  text: string;
  /** Headline number (digits, "/", "%", "+"). */
  stat: string;
  /** Typewriter micro-label under it. */
  statLabel: string;
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
  const statLabel = t(`results.awards.statLabel.${award.id}`);
  const vars = { names, value: award.value, total: award.total ?? '?' };

  switch (award.id) {
    case 'mostConfusing': {
      const photo = award.photoId ? photos.get(award.photoId) : undefined;
      const kind = photo?.photo.kind ?? 'daron';
      const possessive = t(`results.awards.possessiveMid.${kind}`, { name: winners[0]?.name ?? '' });
      return { title, stat, statLabel, text: tpick('results.awards.mostConfusing.text', s, { ...vars, possessive, Possessive: capitalize(possessive) }) };
    }
    case 'biggestMixup': {
      const photo = award.photoId ? photos.get(award.photoId) : undefined;
      const kind = photo?.photo.kind ?? 'daron';
      // {possessive} for relatives ("Paul's mom"), {names} (the owner) for kid / pick / me photos.
      const possessive = t(`results.awards.possessiveMid.${kind}`, { name: winners[0]?.name ?? '' });
      const other = award.otherPlayerId ? playerOr(players, award.otherPlayerId).name : '???';
      return { title, stat, statLabel, text: tpick(`results.awards.biggestMixup.${kind}`, s, { ...vars, possessive, other }) };
    }
    case 'eagleEye': {
      const plural = winners.length > 1 ? 'many' : 'one';
      return { title, stat, statLabel, text: tpick(`results.awards.eagleEye.${plural}`, s, vars) };
    }
    default: {
      const id: PlayerAwardId = award.id;
      const plural = winners.length > 1 ? 'many' : 'one';
      return { title, stat, statLabel, text: tpick(`results.awards.${id}.${flavor}.${plural}`, s, vars) };
    }
  }
}

/** Stamp size that keeps long titles ("Maître du déguisement") on the clipping. */
function stampSize(title: string): number {
  if (title.length > 20) return 16;
  if (title.length > 14) return 19;
  if (title.length > 9) return 23;
  return 27;
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
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const show = ready && inView;
  const copy = awardCopy(award, i18n, players, photos, seed, flavor);
  const look = AWARD_PAPER[award.id];
  const photo = award.photoId ? photos.get(award.photoId) : undefined;
  const winners = award.playerIds.map((id) => playerOr(players, id));
  const other = award.otherPlayerId ? playerOr(players, award.otherPlayerId) : null;
  const delay = (index % 2) * 0.12;
  const tilt = tiltOf(`${award.id}-${index}`, 1.6);
  const stampTilt = -4 - (index % 3) * 2;

  const body = (
    <>
      {/* The title, rubber-stamped across the clipping */}
      <div className="min-h-12 pt-1">
        <h3 className="sr-only">{copy.title}</h3>
        {show && (
          <span aria-hidden>
            <RubberStamp tone={look.stamp} size={stampSize(copy.title)} tilt={stampTilt} animate={delay + 0.25} sound={index < 4}>
              {copy.title}
            </RubberStamp>
          </span>
        )}
      </div>

      {/* Winners as stickers, names in bold; the headline number on the right */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {winners.map((p, i) => (
            <span key={p.id} className="inline-flex max-w-full min-w-0 items-center gap-1.5">
              <Avatar player={p} size="md" crown={false} dimOffline={false} selfie tilt={i % 2 ? 5 : -5} />
              <span className={cn('truncate font-display text-lg leading-tight', p.id === meId && 'rounded-[2px] bg-yellow/90 px-1')}>{p.name}</span>
            </span>
          ))}
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          <span className="font-num text-[40px] leading-[0.85] sm:text-[44px]">{copy.stat}</span>
          <span className="label-type mt-1">{copy.statLabel}</span>
        </div>
      </div>

      <div className={cn('mt-3 flex items-start gap-3', photo ? 'flex-row' : 'flex-col')}>
        {photo && (
          <div className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenPhoto(photo)}
              className="block cursor-zoom-in rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue"
              aria-label={t(`common.possessive.${photo.photo.kind}`, { name: playerOr(players, photo.ownerId).name })}
            >
              <Polaroid src={photo.photo.url} alt={t('results.awards.photoOf')} tilt={tiltOf(photo.photo.id, 5)} tape="cream" className="w-24 p-1.5! pb-3! sm:w-28" />
            </button>
          </div>
        )}
        <p className="text-pen min-w-0 flex-1 text-[21px] leading-[1.08]">{copy.text}</p>
      </div>

      {award.id === 'biggestMixup' && other && (
        <div className="mt-2 flex items-center justify-end gap-2 pr-1">
          <Annotation font="marker" size={17} rotate={-4} animate={show} delay={delay + 0.7}>
            {t('results.notes.suspect')} →
          </Annotation>
          <span className="relative">
            <Avatar player={other} size="md" crown={false} dimOffline={false} selfie tilt={6} label={other.name} />
            <span className="absolute -top-2 -right-2 font-marker text-2xl leading-none text-red-ink" aria-hidden>
              ?
            </span>
          </span>
          <span className="max-w-24 truncate font-display text-base">{other.name}</span>
        </div>
      )}
    </>
  );

  const motionProps = {
    initial: { opacity: 0, y: 30, scale: 0.92 },
    animate: show ? { opacity: 1, y: 0, scale: 1 } : undefined,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22, delay },
  };

  return (
    <motion.div ref={ref} className={cn('relative pt-2', wide && 'sm:col-span-2')} {...motionProps}>
      {look.paper === 'notebook' ? (
        <NotebookCard tilt={tilt} margin={18} className="h-full pt-4 pr-4 pb-6" wrapperClassName="h-full">
          {body}
        </NotebookCard>
      ) : (
        <Paper
          surface={look.paper as PaperSurface}
          torn="b"
          seed={award.id}
          tilt={tilt}
          className="h-full px-4 pt-4 pb-6"
          wrapperClassName="h-full"
        >
          {body}
        </Paper>
      )}
      <Tape tone={look.tape} width={70} height={22} rotate={index % 2 ? 4 : -5} className="top-0 left-1/2 z-10 -translate-x-1/2" />
    </motion.div>
  );
}

/** The awards: clippings, post-its and notebook scraps, each with a rubber-stamped title. */
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
      <Paper surface="kraft" torn="tb" tilt={-1} className="px-5 py-4 text-center">
        <p className="text-pen text-[22px]">{t('results.awards.none')}</p>
      </Paper>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
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
