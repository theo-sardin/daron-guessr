import { motion, useReducedMotion } from 'motion/react';
import { MAX_PLAYERS, type RoomPeek } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { IconBadge, type IconBadgeTone } from '../../components/IconBadge';
import { Spinner } from '../../components/Spinner';
import { pad, Stamp } from '../../components/Stamp';
import { Viewfinder } from '../../components/Viewfinder';
import { useI18n } from '../../i18n';
import { cn, hashString } from '../../lib/util';

/** Where the ticket is torn: two notches on the edges (holes onto the night background). */
function Perforation() {
  return (
    <div className="relative" aria-hidden>
      <span className="absolute top-1/2 -left-[15px] size-6 -translate-y-1/2 rounded-full border-3 border-ink bg-grape-900" />
      <span className="absolute top-1/2 -right-[15px] size-6 -translate-y-1/2 rounded-full border-3 border-ink bg-grape-900" />
      <div className="mx-4 border-t-3 border-dashed border-ink/35" />
    </div>
  );
}

/** Invitation ticket: the room code as a date-stamp imprint, the host and how many seats are taken. */
export function RoomTicket({ code, peek, loading }: { code: string; peek: RoomPeek | null; loading: boolean }) {
  const { t, tpick } = useI18n();
  const reduce = useReducedMotion();
  const count = peek?.playerCount ?? 0;
  return (
    <motion.section
      className="relative mb-5 rounded-[var(--radius-blob)] border-3 border-ink bg-cream text-ink shadow-pop-lg"
      initial={{ scale: 0.7, opacity: 0, rotate: 6 }}
      animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 16 }}
    >
      <div className="flex items-center justify-between gap-3 p-4 pb-4">
        <div className="min-w-0">
          <p className="label-mono mb-[1.1rem] text-ink-soft">{t('common.room')}</p>
          <Viewfinder className="ml-2.5 inline-block" color="var(--color-ink)" gap={9} length={13} thickness={3} snap={0.2}>
            <Stamp variant="mono" size="xl" glow={false} ariaLabel={code} valueClassName="block">
              {code}
            </Stamp>
          </Viewfinder>
        </div>
        <motion.span
          className="mr-1 flex"
          animate={
            reduce ? undefined : loading ? { x: [0, -4, 3, -4, 0], rotate: [0, -6, 4, -6, 0] } : { rotate: [0, -6, 6, 0], y: [0, -4, 0] }
          }
          transition={loading ? { duration: 0.5, repeat: Infinity, repeatDelay: 0.3 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          {loading ? (
            <IconBadge name="hand" tone="cream" size="lg" tilt={-6} />
          ) : peek ? (
            <IconBadge name="sparkle" tone="pink" size="lg" tilt={6} />
          ) : (
            <IconBadge name="eye-off" tone="cream" size="lg" tilt={-4} />
          )}
        </motion.span>
      </div>

      <Perforation />

      <div className="px-4 pt-5 pb-4">
        {loading || !peek ? (
          <div className="flex min-h-[4.25rem] items-center gap-2.5 font-bold" role="status">
            {loading ? (
              <>
                <Spinner className="size-6 text-ink" />
                {tpick('home.join.checking', hashString(code))}
              </>
            ) : (
              <>
                <Icon name="info" className="size-6 text-ink-soft" />
                <span className="font-mono tracking-[0.2em] text-ink-soft">???</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex min-h-[4.25rem] flex-col gap-3">
            {peek.hostName && (
              <motion.div className="flex min-w-0 items-center gap-2.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                {peek.hostAvatar ? (
                  // The shared Avatar: same crown (and screen-reader "host") as in the lobby.
                  <Avatar player={{ avatar: peek.hostAvatar, color: 'var(--color-sun)', isHost: true }} size="sm" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun shadow-pop-sm">
                    <Icon name="user" className="size-5" />
                  </span>
                )}
                <span className="min-w-0 truncate font-extrabold">{t('home.join.hostedBy', { name: peek.hostName })}</span>
              </motion.div>
            )}
            {/* Seats gauge: one dot per seat (taken ones filled), the count stamped on the right. */}
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
              <div className="min-w-0" aria-hidden>
                <span className="label-mono mb-1.5 block text-ink-soft">{t('home.join.seats')}</span>
                <div className="flex gap-1">
                  {Array.from({ length: MAX_PLAYERS }, (_, i) => (
                    <motion.span
                      key={i}
                      className={cn('size-3.5 rounded-full border-2', i < count ? 'border-ink bg-pink' : 'border-ink/30 bg-transparent')}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.3 + i * 0.03 }}
                    />
                  ))}
                </div>
              </div>
              <Stamp size="md" glow={false} className="-mb-px" ariaLabel={t('home.join.playersInside', { count, max: MAX_PLAYERS })}>
                {`${pad(count)}/${pad(MAX_PLAYERS)}`}
              </Stamp>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

export type Problem = 'notFound' | 'inProgress' | 'full';

const PROBLEMS: Record<Problem, { icon: IconName; badge: IconBadgeTone; title: 'home.join.notFoundTitle' | 'home.join.inProgressTitle' | 'home.join.fullTitle'; body: 'home.join.notFoundBody' | 'home.join.inProgressBody' | 'home.join.fullBody'; tone: 'cream' | 'sky' | 'pink' }> = {
  notFound: { icon: 'ghost', badge: 'lilac', title: 'home.join.notFoundTitle', body: 'home.join.notFoundBody', tone: 'cream' },
  inProgress: { icon: 'film', badge: 'sky', title: 'home.join.inProgressTitle', body: 'home.join.inProgressBody', tone: 'cream' },
  full: { icon: 'users', badge: 'pink', title: 'home.join.fullTitle', body: 'home.join.fullBody', tone: 'cream' },
};

/** Friendly dead end: room not found, game already started, or room full. */
export function ProblemCard({
  problem,
  code,
  checking,
  onRetry,
  onHome,
}: {
  problem: Problem;
  code: string;
  checking: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  const t = useI18n().t;
  const reduce = useReducedMotion();
  const p = PROBLEMS[problem];
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center">
      <Card
        key={problem}
        tone={p.tone}
        className="w-full text-center"
        initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 15 }}
      >
        <motion.div
          className="mx-auto -mt-14 mb-3 flex w-fit"
          animate={reduce ? undefined : { rotate: [0, -8, 8, 0], y: [0, -6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          <IconBadge name={p.icon} tone={p.badge} size="xl" tilt={-4} />
        </motion.div>
        <p className="mb-2 flex items-baseline justify-center gap-2 text-ink-soft">
          <span className="label-mono">{t('common.room')}</span>
          <Stamp variant="mono" size="sm" glow={false}>
            {code}
          </Stamp>
        </p>
        <h1 className="font-display text-3xl leading-tight">{t(p.title)}</h1>
        <p className="mx-auto mt-2 mb-5 max-w-xs font-semibold text-balance text-ink-soft">{t(p.body, { code, max: MAX_PLAYERS })}</p>
        <div className="flex flex-col gap-3">
          {problem !== 'notFound' && (
            <Button variant="sun" size="lg" block loading={checking} onClick={onRetry} icon={<Icon name="refresh" className="size-5" weight="bold" />}>
              {t('home.join.checkAgain')}
            </Button>
          )}
          <Button variant={problem === 'notFound' ? 'primary' : 'secondary'} size="lg" block onClick={onHome} icon={<Icon name="arrow-left" className="size-5" weight="bold" />}>
            {t('common.backHome')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
