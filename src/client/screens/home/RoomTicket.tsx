import { motion, useReducedMotion } from 'motion/react';
import { MAX_PLAYERS, type RoomPeek } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { DymoLabel } from '../../components/DymoLabel';
import { Icon } from '../../components/Icon';
import { NotebookCard } from '../../components/Paper';
import { RubberStamp } from '../../components/RubberStamp';
import { Spinner } from '../../components/Spinner';
import { TornPaper } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { cn, hashString } from '../../lib/util';

/** Where the ticket tears off: a dashed line between two notches punched in the paper. */
function Perforation() {
  return (
    <div className="relative h-0" aria-hidden>
      <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-paper shadow-[inset_-2px_0_3px_rgb(40_25_10/0.18)]" />
      <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-paper shadow-[inset_2px_0_3px_rgb(40_25_10/0.18)]" />
      <div className="mx-5 border-t-2 border-dashed border-ink/30" />
    </div>
  );
}

/**
 * The invitation ticket: the room code on a red Dymo label, who hosts, and the seats taken
 * (one dot per seat, the count in big bold numbers).
 */
export function RoomTicket({ code, peek, loading }: { code: string; peek: RoomPeek | null; loading: boolean }) {
  const { t, tpick } = useI18n();
  const reduce = useReducedMotion();
  const count = peek?.playerCount ?? 0;
  return (
    <motion.section
      className="relative mb-6"
      initial={reduce ? false : { scale: 0.75, opacity: 0, rotate: 6 }}
      animate={{ scale: 1, opacity: 1, rotate: -1.2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
    >
      <TornPaper surface="grain" edges="lr" amp={2.4} seed={`ticket-${code}`} lift="lg" className="overflow-hidden">
        {/* A halftone band down the left edge, like a printed ticket stub. */}
        <span className="halftone-red absolute inset-y-0 left-0 w-3" aria-hidden />
        <div className="flex items-center justify-between gap-3 pt-4 pr-5 pb-5 pl-7">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-type)] text-[0.78rem] tracking-[0.12em] text-ink-soft uppercase">{t('home.join.ticket')}</p>
            <p className="mt-1 mb-2 font-[family-name:var(--font-type)] text-[0.78rem] text-ink-soft">{t('common.room')}</p>
            <DymoLabel text={code} tone="red" size="lg" tilt={-2} animate={0.25} label={`${t('common.roomCode')} ${code.split('').join(' ')}`} />
          </div>
          <motion.span
            className="flex size-16 shrink-0 items-center justify-center"
            animate={reduce ? undefined : loading ? { rotate: [0, -8, 6, -8, 0] } : { rotate: [0, -5, 5, 0], y: [0, -3, 0] }}
            transition={loading ? { duration: 0.5, repeat: Infinity, repeatDelay: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            {loading ? (
              <Icon name="hand" className="size-12 text-ink" />
            ) : peek ? (
              <RubberStamp tone="blue" size={15} tilt={-14}>
                {t('home.join.openStamp')}
              </RubberStamp>
            ) : (
              <Icon name="eye-off" className="size-11 text-ink-soft" />
            )}
          </motion.span>
        </div>

        <Perforation />

        <div className="pt-4 pr-5 pb-5 pl-7">
          {loading || !peek ? (
            <div className="flex min-h-[4.5rem] items-center gap-2.5 font-bold" role="status">
              {loading ? (
                <>
                  <Spinner className="size-6 text-ink" />
                  <span className="text-pen text-[1.2rem]">{tpick('home.join.checking', hashString(code))}</span>
                </>
              ) : (
                <>
                  <Icon name="info" className="size-6 text-ink-soft" />
                  <span className="font-num text-2xl tracking-[0.2em] text-ink-soft">???</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex min-h-[4.5rem] flex-col gap-3">
              {peek.hostName && (
                <motion.div className="flex min-w-0 items-center gap-2.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  {peek.hostAvatar ? (
                    // The shared Avatar: same crown (and screen-reader "host") as in the lobby.
                    <Avatar player={{ avatar: peek.hostAvatar, color: 'var(--color-yellow)', isHost: true }} size="sm" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow shadow-paper-sm">
                      <Icon name="user" className="size-5" />
                    </span>
                  )}
                  <span className="min-w-0 truncate text-[1.05rem] font-extrabold">{t('home.join.hostedBy', { name: peek.hostName })}</span>
                </motion.div>
              )}
              {/* Seats gauge: one dot per seat (taken ones filled), the count in big numbers. */}
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0" aria-hidden>
                  <span className="mb-1.5 block font-[family-name:var(--font-type)] text-[0.78rem] text-ink-soft uppercase">{t('home.join.seats')}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: MAX_PLAYERS }, (_, i) => (
                      <motion.span
                        key={i}
                        className={cn('size-3.5 rounded-full', i < count ? 'bg-blue' : 'border-2 border-ink/25')}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.3 + i * 0.03 }}
                      />
                    ))}
                  </div>
                </div>
                <p className="font-num text-[2rem] leading-none" aria-label={t('home.join.playersInside', { count, max: MAX_PLAYERS })}>
                  {count}
                  <span className="text-ink-faint">/{MAX_PLAYERS}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </TornPaper>
    </motion.section>
  );
}

export type Problem = 'notFound' | 'inProgress' | 'full';

const PROBLEMS: Record<
  Problem,
  {
    title: 'home.join.notFoundTitle' | 'home.join.inProgressTitle' | 'home.join.fullTitle';
    body: 'home.join.notFoundBody' | 'home.join.inProgressBody' | 'home.join.fullBody';
    stamp: 'home.join.notFoundStamp' | 'home.join.inProgressStamp' | 'home.join.fullStamp';
  }
> = {
  notFound: { title: 'home.join.notFoundTitle', body: 'home.join.notFoundBody', stamp: 'home.join.notFoundStamp' },
  inProgress: { title: 'home.join.inProgressTitle', body: 'home.join.inProgressBody', stamp: 'home.join.inProgressStamp' },
  full: { title: 'home.join.fullTitle', body: 'home.join.fullBody', stamp: 'home.join.fullStamp' },
};

/** Friendly dead end: room not found, game already started, or room full (a page with a big stamp on it). */
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
  const p = PROBLEMS[problem];
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center">
      <NotebookCard key={problem} tilt={-1} tape slap wrapperClassName="w-full" className="pt-6 pr-5 pb-7 text-center">
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <span className="font-[family-name:var(--font-type)] text-[0.8rem] text-ink-soft">{t('common.room')}</span>
          <DymoLabel text={code} tone="red" size="md" tilt={-2} />
        </div>
        <div className="mb-4 flex justify-center">
          <RubberStamp size="lg" tilt={-9} animate={0.3}>
            {t(p.stamp)}
          </RubberStamp>
        </div>
        <h1 className="text-[1.9rem] leading-tight font-black tracking-[-0.015em]" style={{ fontStretch: '110%' }}>
          {t(p.title)}
        </h1>
        <p className="text-pen mx-auto mt-2 mb-6 max-w-xs text-[1.2rem] leading-tight text-balance">{t(p.body, { code, max: MAX_PLAYERS })}</p>
        <div className="flex flex-col gap-4">
          {problem !== 'notFound' && (
            <Button variant="sun" size="lg" block loading={checking} onClick={onRetry} icon={<Icon name="refresh" className="size-5" weight="bold" />}>
              {t('home.join.checkAgain')}
            </Button>
          )}
          <Button variant={problem === 'notFound' ? 'primary' : 'secondary'} size="lg" block onClick={onHome} icon={<Icon name="arrow-left" className="size-5" weight="bold" />}>
            {t('common.backHome')}
          </Button>
        </div>
      </NotebookCard>
    </div>
  );
}
