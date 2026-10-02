import { motion } from 'motion/react';
import type { Award, PhotoResult, PublicPlayer, RankingEntry } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { CountUp } from './CountUp';
import { awardEmoji, flavorOfKinds, seedOf, shareTone, tiltOf, type Flavor } from './helpers';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

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

/** "Your game": personal rank, guesses, speed bonus, how many people recognised your photos, your awards. */
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
  /** Flavor of one award (its title and emoji depend on it). */
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

  return (
    <Card
      tone="cream"
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 40, rotate: -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="flex items-center gap-4">
        <motion.div
          className="relative flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-ink bg-sun shadow-pop"
          initial={{ scale: 0, rotate: -90 }}
          whileInView={{ scale: 1, rotate: -6 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.15 }}
          role="img"
          aria-label={t('results.mine.rankAria', { rank: me.rank, count: ranking.length })}
        >
          {MEDALS[me.rank] && (
            <span className="absolute -top-4 -right-2 text-4xl drop-shadow-[0_2px_0_rgba(27,16,54,0.6)]" aria-hidden>
              {MEDALS[me.rank]}
            </span>
          )}
          <span className="font-display text-4xl leading-none" aria-hidden>
            {t('results.mine.rank', { rank: me.rank })}
          </span>
          <span className="text-xs font-extrabold text-ink/70" aria-hidden>
            {t('results.mine.outOf', { count: ranking.length })}
          </span>
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar player={player} size="md" crown={false} dimOffline={false} selfie />
            <span className="truncate font-display text-2xl leading-tight">{player.name}</span>
          </div>
          <p className="mt-1 leading-snug font-bold text-ink-soft">{verdictText}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-3 border-ink bg-mint p-3 text-center shadow-pop-sm">
          <div className="font-display text-3xl leading-none">
            <CountUp to={me.correct} delay={0.3} />
            <span className="opacity-60">/{me.guesses}</span>
          </div>
          <div className="mt-1 text-xs font-extrabold text-ink/75">✓ {t('results.mine.guessed')}</div>
        </div>
        <div className="rounded-2xl border-3 border-ink bg-sky p-3 text-center shadow-pop-sm">
          {photos.length > 0 ? (
            <>
              <div className="font-display text-3xl leading-none">
                <CountUp to={found} delay={0.45} />
                <span className="opacity-60">/{votes}</span>
              </div>
              <div className="mt-1 text-xs font-extrabold text-ink/75">👀 {t(`results.mine.recognised.${myFlavor}`)}</div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-extrabold text-ink/75">🤷 {t(`results.mine.noPhotos.${flavor}`)}</div>
          )}
        </div>
        {me.bonus > 0 && (
          <div className="col-span-2 flex items-center justify-center gap-2.5 rounded-2xl border-3 border-ink bg-tangerine px-3 py-2 shadow-pop-sm">
            <span className="text-2xl leading-none" aria-hidden>
              ⚡
            </span>
            <span className="font-display text-3xl leading-none">
              +<CountUp to={me.bonus} delay={0.6} />
            </span>
            <span className="text-xs font-extrabold text-ink/75">{t('results.mine.bonus')}</span>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {photos.map((p) => {
            const label = t(`results.mine.yourPhoto.${p.photo.kind}`);
            return (
              <motion.button
                key={p.photo.id}
                type="button"
                onClick={() => onOpenPhoto(p)}
                whileTap={{ scale: 0.94 }}
                className="relative flex cursor-zoom-in flex-col items-center rounded-md border-3 border-ink bg-white p-1.5 pb-1 shadow-pop-sm"
                style={{ rotate: tiltOf(p.photo.id, 5) }}
                aria-label={
                  p.totalVotes > 0
                    ? t('results.mine.photoAria', { photo: label, correct: p.correctVotes, total: p.totalVotes })
                    : `${label} · ${t('results.mine.noVotes')}`
                }
              >
                <img src={p.photo.url} alt="" className="block size-20 rounded-sm object-cover" draggable={false} />
                <span className="mt-1 line-clamp-2 max-w-20 text-center text-xs leading-tight font-extrabold">{label}</span>
                <span
                  className={cn(
                    'absolute -top-2.5 -right-2.5 rounded-full border-2 border-ink px-1.5 py-0.5 font-display text-xs whitespace-nowrap',
                    shareTone(p),
                  )}
                >
                  {p.totalVotes > 0 ? t('results.mine.photoScore', { correct: p.correctVotes, total: p.totalVotes }) : t('results.mine.noVotes')}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {myAwards.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-extrabold tracking-wide text-ink/60 uppercase">{t('results.mine.yourAwards')}</div>
          <ul className="flex flex-wrap gap-2">
            {myAwards.map((a) => {
              const f = awardFlavor(a);
              return (
                <li key={a.id} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-2.5 py-1 text-sm font-extrabold shadow-pop-sm">
                  <span aria-hidden>{awardEmoji(a.id, f)}</span>
                  {t(`results.awards.${a.id}.title.${f}`)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Button variant="sky" size="md" block className="mt-5" onClick={onShare} loading={sharing} icon={<span aria-hidden>📣</span>}>
        {t('results.mine.share')}
      </Button>
    </Card>
  );
}
