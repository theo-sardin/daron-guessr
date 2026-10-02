import { motion, useReducedMotion } from 'motion/react';
import { MAX_PLAYERS, PLAYER_COLORS, type RoomPeek } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useI18n } from '../../i18n';
import { cn, hashString } from '../../lib/util';

const TILTS = [-5, 3, -3, 5];

/** The room code as four chunky tiles that drop in one by one (read letter by letter). */
function CodeTiles({ code }: { code: string }) {
  const t = useI18n().t;
  return (
    <div className="flex gap-1.5" role="img" aria-label={`${t('common.roomCode')} ${code.split('').join(' ')}`}>
      {code.split('').map((ch, i) => (
        <motion.span
          key={i}
          className="flex size-12 items-center justify-center rounded-xl border-3 border-ink bg-white font-display text-3xl text-ink shadow-pop-sm"
          initial={{ y: -40, opacity: 0, rotate: TILTS[i] * 4 }}
          animate={{ y: 0, opacity: 1, rotate: TILTS[i] }}
          transition={{ type: 'spring', stiffness: 520, damping: 14, delay: 0.15 + i * 0.08 }}
          aria-hidden
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

/** Invitation ticket: room code, host and how many seats are taken. */
export function RoomTicket({ code, peek, loading }: { code: string; peek: RoomPeek | null; loading: boolean }) {
  const { t, tpick } = useI18n();
  const reduce = useReducedMotion();
  const count = peek?.playerCount ?? 0;
  return (
    <motion.section
      className="relative mb-5 rounded-[var(--radius-blob)] border-3 border-ink bg-sun text-ink shadow-pop-lg"
      initial={{ scale: 0.7, opacity: 0, rotate: 6 }}
      animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 16 }}
    >
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-extrabold tracking-[0.25em] uppercase opacity-70" aria-hidden>
            🎟️ {t('common.room')}
          </p>
          <CodeTiles code={code} />
        </div>
        <motion.span
          className="text-5xl leading-none sm:text-6xl"
          animate={reduce ? undefined : loading ? { rotate: [0, -8, 8, -8, 0] } : { rotate: [0, -6, 6, 0], y: [0, -4, 0] }}
          transition={loading ? { duration: 0.5, repeat: Infinity, repeatDelay: 0.3 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          {loading ? '🚪' : peek ? '🥳' : '🤔'}
        </motion.span>
      </div>

      <div className="border-t-3 border-dashed border-ink/40 px-4 pt-3 pb-4">
        {loading || !peek ? (
          <div className="flex min-h-[4.25rem] items-center gap-2 font-bold" role="status">
            {loading ? (
              <>
                <motion.span
                  className="text-2xl"
                  animate={reduce ? undefined : { x: [0, -3, 3, 0] }}
                  transition={{ duration: 0.35, repeat: Infinity }}
                  aria-hidden
                >
                  ✊
                </motion.span>
                {tpick('home.join.checking', hashString(code))}
              </>
            ) : (
              <>
                <span className="text-2xl" aria-hidden>
                  🤷
                </span>
                <span className="opacity-70">???</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex min-h-[4.25rem] flex-col gap-2.5">
            {peek.hostName && (
              <motion.div className="flex min-w-0 items-center gap-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                {/* The shared Avatar: same crown (and screen-reader "host") as in the lobby. */}
                <Avatar player={{ avatar: peek.hostAvatar ?? '👤', color: 'var(--color-pink)', isHost: true }} size="sm" />
                <span className="min-w-0 truncate font-extrabold">{t('home.join.hostedBy', { name: peek.hostName })}</span>
              </motion.div>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: MAX_PLAYERS }, (_, i) => (
                  <motion.span
                    key={i}
                    className={cn('size-3.5 rounded-full border-2 border-ink', i >= count && 'bg-white/60')}
                    style={i < count ? { backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] } : undefined}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.3 + i * 0.03 }}
                  />
                ))}
              </div>
              <span className="text-sm font-extrabold whitespace-nowrap">{t('home.join.playersInside', { count, max: MAX_PLAYERS })}</span>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

export type Problem = 'notFound' | 'inProgress' | 'full';

const PROBLEMS: Record<
  Problem,
  {
    emoji: string;
    title: 'home.join.notFoundTitle' | 'home.join.inProgressTitle' | 'home.join.fullTitle';
    body: 'home.join.notFoundBody' | 'home.join.inProgressBody' | 'home.join.fullBody';
    tone: 'cream' | 'sky' | 'pink';
  }
> = {
  notFound: { emoji: '🏚️', title: 'home.join.notFoundTitle', body: 'home.join.notFoundBody', tone: 'cream' },
  inProgress: { emoji: '🎬', title: 'home.join.inProgressTitle', body: 'home.join.inProgressBody', tone: 'cream' },
  full: { emoji: '🥵', title: 'home.join.fullTitle', body: 'home.join.fullBody', tone: 'cream' },
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
          className="mx-auto -mt-14 mb-2 flex size-24 items-center justify-center rounded-full border-3 border-ink bg-sun text-6xl shadow-pop"
          animate={reduce ? undefined : { rotate: [0, -8, 8, 0], y: [0, -6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          {p.emoji}
        </motion.div>
        <p className="mb-1 text-xs font-extrabold tracking-[0.25em] text-ink-soft uppercase">
          {t('common.room')} {code}
        </p>
        <h1 className="font-display text-3xl leading-tight">{t(p.title)}</h1>
        <p className="mx-auto mt-2 mb-5 max-w-xs font-semibold text-balance text-ink-soft">{t(p.body, { code, max: MAX_PLAYERS })}</p>
        <div className="flex flex-col gap-3">
          {problem !== 'notFound' && (
            <Button variant="sun" size="lg" block loading={checking} onClick={onRetry} icon={<span aria-hidden>🔄</span>}>
              {t('home.join.checkAgain')}
            </Button>
          )}
          <Button variant={problem === 'notFound' ? 'primary' : 'secondary'} size="lg" block onClick={onHome} icon={<span aria-hidden>🏠</span>}>
            {t('common.backHome')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
