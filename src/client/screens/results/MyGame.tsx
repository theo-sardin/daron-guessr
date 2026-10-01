import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { Award, PhotoResult, PublicPlayer, RankingEntry } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Annotation, MarkerCircle } from '../../components/Marker';
import { Paper } from '../../components/Paper';
import { Polaroid } from '../../components/Polaroid';
import { RubberStamp } from '../../components/RubberStamp';
import { Stamp } from '../../components/Stamp';
import { useI18n } from '../../i18n';
import { AWARD_PAPER, flavorOfKinds, seedOf, tiltOf, type Flavor } from './helpers';

type Verdict = 'first' | 'podium' | 'middle' | 'last' | 'afk' | 'nobody';

function verdictOf(me: RankingEntry, ranking: RankingEntry[]): Verdict {
  const lastRank = Math.max(...ranking.map((r) => r.rank));
  if (me.guesses === 0) return 'afk';
  if (me.rank === 1 && me.score === 0) return 'nobody';
  if (me.rank === 1 && me.score > 0) return 'first';
  if (me.rank <= 3 && me.score > 0) return 'podium';
  if (me.rank === lastRank && ranking.length >= 3) return 'last';
  return 'middle';
}

/** One line of the report card: a typewriter subject on the left, the grade on the right. */
function Line({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-dashed border-blue/30 py-2.5">
      <div className="min-w-0">
        <div className="label-type text-[0.8rem] uppercase">{label}</div>
        {sub && <div className="text-pen mt-1 text-[18px] leading-none">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** "Your game" as a report card: rank, guesses, bonus, how your photos did, the teacher's comment, your awards. */
export function MyGame({
  me,
  player,
  ranking,
  photos,
  awards,
  seed,
  flavor,
  awardFlavor,
  onShare,
  sharing,
  onOpenPhoto,
}: {
  me: RankingEntry;
  player: PublicPlayer;
  ranking: RankingEntry[];
  /** Only the viewer's own photos. */
  photos: PhotoResult[];
  awards: Award[];
  seed: string;
  /** The game's flavor. */
  flavor: Flavor;
  /** Flavor of one award (its title depends on it). */
  awardFlavor: (award: Award) => Flavor;
  onShare: () => void;
  sharing: boolean;
  onOpenPhoto: (photo: PhotoResult) => void;
}) {
  const { t, tpick } = useI18n();
  const verdict = verdictOf(me, ranking);
  const found = photos.reduce((n, p) => n + p.correctVotes, 0);
  const votes = photos.reduce((n, p) => n + p.totalVotes, 0);
  const myAwards = awards.filter((a) => a.playerIds.includes(player.id));
  const myFlavor = flavorOfKinds(
    photos.map((p) => p.photo.kind),
    flavor,
  );
  const verdictText =
    verdict === 'first'
      ? tpick(`results.mine.verdict.first.${flavor}`, seedOf(seed, player.id, 'verdict'))
      : tpick(`results.mine.verdict.${verdict}`, seedOf(seed, player.id, 'verdict'));
  const podium = me.score > 0 && me.rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Paper surface="grid" torn="b" tape tilt={-0.6} seed="report" className="px-4 pt-5 pb-7 sm:px-6">
        {/* Header: who, and the rank circled in red */}
        <div className="flex items-start gap-3">
          <Avatar player={player} size="lg" crown={false} dimOffline={false} selfie tilt={-4} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="label-type text-[0.8rem] uppercase">{t('results.mine.card')}</div>
            <div className="truncate font-display text-2xl leading-tight">{player.name}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end" role="img" aria-label={t('results.mine.rankAria', { rank: me.rank, count: ranking.length })}>
            <span className="label-type mb-1" aria-hidden>
              {t('results.mine.rankLabel')}
            </span>
            <span aria-hidden>
              {podium ? (
                <MarkerCircle pad={8} strokeWidth={3} className="flex">
                  <Stamp size="lg" valueClassName="text-red-ink">{`${me.rank}/${ranking.length}`}</Stamp>
                </MarkerCircle>
              ) : (
                <Stamp size="lg">{`${me.rank}/${ranking.length}`}</Stamp>
              )}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <Line label={t('results.mine.guessed')}>
            <Stamp size="md" ariaLabel={`${me.correct}/${me.guesses}`}>{`${me.correct}/${me.guesses}`}</Stamp>
          </Line>
          {me.bonus > 0 && (
            <Line label={t('results.mine.bonus')}>
              <span className="font-num text-[1.6rem] text-red-ink">+{me.bonus}</span>
            </Line>
          )}
          <Line label={t('results.mine.photos')} sub={photos.length > 0 ? t(`results.mine.recognised.${myFlavor}`) : t(`results.mine.noPhotos.${flavor}`)}>
            {photos.length > 0 ? <Stamp size="md">{`${found}/${votes}`}</Stamp> : <span className="font-num text-[1.6rem] text-ink-faint">–</span>}
          </Line>
        </div>

        {photos.length > 0 && (
          <div className="mt-5 mb-4 flex flex-wrap justify-center gap-x-6 gap-y-8">
            {photos.map((p) => {
              const label = t(`results.mine.yourPhoto.${p.photo.kind}`);
              return (
                <div key={p.photo.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onOpenPhoto(p)}
                    className="block cursor-zoom-in focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue"
                    aria-label={label}
                  >
                    <Polaroid
                      src={p.photo.url}
                      tilt={tiltOf(p.photo.id, 5)}
                      tape="cream"
                      caption={<span className="block max-w-[6rem] truncate">{label}</span>}
                      className="w-[6.5rem] p-1.5! pb-1!"
                      captionClassName="text-[1.2rem]!"
                    />
                  </button>
                  <span className="pointer-events-none absolute -right-5 -bottom-6" aria-label={t('results.mine.photoScoreAria', { correct: p.correctVotes, total: p.totalVotes })} role="img">
                    <Annotation rotate={-8} size={19}>
                      {p.totalVotes > 0 ? t('results.wall.badge', { correct: p.correctVotes, total: p.totalVotes }) : t('results.mine.noVotes')}
                    </Annotation>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* The teacher's comment, in red marker */}
        <div className="mt-6">
          <div className="label-type text-[0.8rem] uppercase">{t('results.mine.comment')}</div>
          <Annotation as="p" size={21} rotate={-1} className="mt-1.5 leading-[1.15]">
            {verdictText}
          </Annotation>
        </div>

        {myAwards.length > 0 && (
          <div className="mt-5">
            <div className="label-type text-[0.8rem] uppercase">{t('results.mine.yourAwards')}</div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
              {myAwards.map((a, i) => (
                <li key={a.id}>
                  <RubberStamp tone={AWARD_PAPER[a.id].stamp} size={14} tilt={i % 2 ? 3 : -4}>
                    {t(`results.awards.${a.id}.title.${awardFlavor(a)}`)}
                  </RubberStamp>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button variant="secondary" size="md" block className="mt-6" onClick={onShare} loading={sharing} icon={<Icon name="share" weight="bold" className="size-5" />}>
          {t('results.mine.share')}
        </Button>
      </Paper>
    </motion.div>
  );
}
