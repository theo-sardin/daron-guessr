import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { Award, PhotoResult, PublicPlayer, RankingEntry } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { pad, Stamp } from '../../components/Stamp';
import { useI18n } from '../../i18n';
import { CountUp } from './CountUp';
import { AWARD_TONE, awardIcon, flavorOfKinds, MEDAL_TONE, medalIcon, seedOf, tiltOf, type Flavor } from './helpers';
import { DateImprint } from './DateImprint';

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

/** A stat on paper: "value/total" printed as a date stamp, icon + caption under it (beside it when wide). */
function StatTile({ icon, caption, value, total }: { icon: IconName; caption: string; value: ReactNode; total: number }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 rounded-2xl border-3 border-ink bg-white p-3 shadow-pop-sm sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <span className="flex shrink-0 items-baseline">
        <Stamp glow={false} size="lg">
          {value}
        </Stamp>
        <Stamp glow={false} size="lg" className="opacity-60">
          {`/${total}`}
        </Stamp>
      </span>
      <div className="flex items-start gap-1 text-xs leading-tight font-extrabold text-ink/75 sm:text-sm">
        <Icon name={icon} weight="bold" className="mt-px size-3.5 shrink-0 sm:size-4" />
        <span>{caption}</span>
      </div>
    </div>
  );
}

/** "Your game": personal rank, guesses, how many people recognised your photos, your awards. */
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
  /** Flavor of one award (its title and icon depend on it). */
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
  const medal = me.score > 0 ? medalIcon(me.rank) : null;

  return (
    <Card
      tone="cream"
      className="relative"
      initial={{ opacity: 0, y: 40, rotate: -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="flex items-center gap-4">
        {/* Rank on a small dark display, a medal sticker slapped on its corner */}
        <motion.div
          className="relative shrink-0"
          initial={{ scale: 0, rotate: -20 }}
          whileInView={{ scale: 1, rotate: -3 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}
        >
          <div
            className="flex flex-col items-start gap-2 rounded-2xl border-3 border-ink bg-ink px-3 pt-2.5 pb-2.5 text-cream shadow-pop"
            role="img"
            aria-label={t('results.mine.rankAria', { rank: me.rank, count: ranking.length })}
          >
            <span className="label-mono text-cream/60" aria-hidden>
              {t('results.mine.rankLabel')}
            </span>
            <span className="flex items-baseline gap-1" aria-hidden>
              <Stamp size="xl">{pad(me.rank)}</Stamp>
              <Stamp size="sm" className="opacity-70">
                {`/${pad(ranking.length)}`}
              </Stamp>
            </span>
          </div>
          {medal && <IconBadge name={medal} tone={MEDAL_TONE[me.rank]} size="md" tilt={12} className="absolute -top-4 -right-4" />}
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar player={player} size="sm" crown={false} dimOffline={false} />
            <span className="truncate font-display text-2xl leading-tight">{player.name}</span>
          </div>
          <p className="mt-1 leading-snug font-bold text-ink-soft">{verdictText}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile icon="check" caption={t('results.mine.guessed')} value={<CountUp to={me.correct} delay={0.3} plain />} total={me.guesses} />
        {photos.length > 0 ? (
          <StatTile icon="eye" caption={t(`results.mine.recognised.${myFlavor}`)} value={<CountUp to={found} delay={0.45} plain />} total={votes} />
        ) : (
          <div className="flex flex-col items-start justify-center gap-1.5 rounded-2xl border-3 border-dashed border-ink/40 p-3 text-sm leading-tight font-extrabold text-ink/65 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
            <Icon name="image" className="size-6" />
            {t(`results.mine.noPhotos.${flavor}`)}
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-3">
          {photos.map((p) => {
            const label = t(`results.mine.yourPhoto.${p.photo.kind}`);
            return (
              <motion.button
                key={p.photo.id}
                type="button"
                onClick={() => onOpenPhoto(p)}
                whileTap={{ scale: 0.94 }}
                whileHover={{ rotate: 0, scale: 1.04 }}
                className="relative flex flex-col items-center rounded-md border-3 border-ink bg-white p-1.5 pb-0.5 shadow-pop-sm"
                style={{ rotate: tiltOf(p.photo.id, 5) }}
                aria-label={label}
              >
                <span className="relative block overflow-hidden rounded-sm">
                  <img src={p.photo.url} alt="" className="block size-20 object-cover" draggable={false} />
                  <DateImprint id={p.photo.id} className="right-1 bottom-1" />
                </span>
                <span className="text-hand mt-0.5 max-w-[5.5rem] truncate pr-1 pl-0.5 text-xl">{label}</span>
                <span className="absolute -top-3 -right-3 flex rounded-lg border-2 border-ink bg-ink px-1.5 py-1 shadow-[0_2px_0_0_var(--color-ink)]">
                  {p.totalVotes > 0 ? (
                    <Stamp size="xs" ariaLabel={t('results.mine.photoScoreAria', { correct: p.correctVotes, total: p.totalVotes })}>
                      {t('results.mine.photoScore', { correct: p.correctVotes, total: p.totalVotes })}
                    </Stamp>
                  ) : (
                    <span className="label-mono text-[0.625rem] text-cream/70">{t('results.mine.noVotes')}</span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {myAwards.length > 0 && (
        <div className="mt-5">
          <div className="label-mono mb-2 text-ink/60">{t('results.mine.yourAwards')}</div>
          <div className="flex flex-wrap gap-2">
            {myAwards.map((a) => {
              const f = awardFlavor(a);
              return (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white py-0.5 pr-3 pl-0.5 text-sm font-extrabold shadow-pop-sm"
                >
                  <IconBadge name={awardIcon(a.id, f)} tone={AWARD_TONE[a.id]} size="xs" shadow={false} className="rounded-full" />
                  {t(`results.awards.${a.id}.title.${f}`)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <Button variant="sky" size="md" block className="mt-5" onClick={onShare} loading={sharing} icon={<Icon name="share" weight="bold" className="size-5" />}>
        {t('results.mine.share')}
      </Button>
    </Card>
  );
}
