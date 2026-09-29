import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { POINTS_PER_CORRECT, type PhotoKind, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import type { IconName } from '../../components/Icon';
import { IconBadge, type IconBadgeTone } from '../../components/IconBadge';
import { Stamp, pad } from '../../components/Stamp';
import { useI18n } from '../../i18n';
import type { PersonalResult } from './effects';
import { CAPTION_GROUP } from './kinds';

/** One icon sticker per verdict (no faces: the type carries the mood). */
const VERDICT: Record<PersonalResult, { icon: IconName; tone: IconBadgeTone }> = {
  right: { icon: 'target', tone: 'mint' },
  wrong: { icon: 'x', tone: 'danger' },
  proud: { icon: 'mask', tone: 'sun' },
  offended: { icon: 'mask', tone: 'pink' },
  none: { icon: 'clock', tone: 'cream' },
};

const ENTER = {
  initial: { opacity: 0, y: 24, scale: 0.8, rotate: -3 },
  animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
  transition: { delay: 0.6, type: 'spring' as const, stiffness: 420, damping: 18 },
};

/** The verdict sticker, slapped on a beat after the card lands. */
function Sticker({ result, size = 'lg' }: { result: PersonalResult; size?: 'md' | 'lg' }) {
  const v = VERDICT[result];
  return (
    <motion.span
      className="inline-flex shrink-0"
      initial={{ scale: 0, rotate: -30 }}
      animate={
        result === 'wrong' || result === 'offended'
          ? { scale: [0, 1.25, 1], rotate: [-30, -6, -6], x: [0, 0, -3, 3, -2, 0] }
          : { scale: [0, 1.25, 1], rotate: [-30, 8, -6] }
      }
      transition={{ delay: 0.85, duration: 0.55 }}
    >
      <IconBadge name={v.icon} tone={v.tone} size={size} />
    </motion.span>
  );
}

function Row({ children, aside, result, glass }: { children: ReactNode; aside?: ReactNode; result: PersonalResult; glass?: boolean }) {
  return (
    <Card tone={glass ? 'glass' : 'cream'} padded={false} className="flex items-center gap-3.5 px-4 py-3.5" {...ENTER}>
      <Sticker result={result} />
      <div className="min-w-0 flex-1">{children}</div>
      {aside}
    </Card>
  );
}

const TITLE = 'font-display text-[1.65rem] leading-[1.02] tracking-[-0.02em] break-words [font-stretch:80%]';

/** The viewer's private verdict for this photo, shown once the owner is revealed. */
export function Feedback({
  result,
  kind,
  index,
  picked,
  correct,
  total,
}: {
  result: PersonalResult;
  kind: PhotoKind;
  index: number;
  /** The candidate the viewer voted for (wrong answers). */
  picked: PublicPlayer | null;
  correct: number;
  total: number;
}) {
  const { t, tpick } = useI18n();

  if (result === 'right') {
    return (
      <Row
        result={result}
        aside={
          <motion.span
            className="shrink-0"
            initial={{ scale: 0, rotate: 20 }}
            animate={{ scale: [0, 1.2, 1], rotate: [20, -8, -4] }}
            transition={{ delay: 1, duration: 0.45 }}
          >
            <Stamp glow={false} size="lg" valueClassName="text-[1.35rem]">{`+${POINTS_PER_CORRECT}`}</Stamp>
          </motion.span>
        }
      >
        <p className={TITLE}>{tpick('reveal.me.rightTitle', index)}</p>
        <p className="mt-0.5 text-sm font-bold text-ink-soft">{t('reveal.me.rightSub')}</p>
      </Row>
    );
  }

  if (result === 'wrong') {
    return (
      <Row
        result={result}
        aside={
          picked && (
            <motion.span className="shrink-0" animate={{ rotate: [0, -12, 12, -8, 0] }} transition={{ delay: 1, duration: 0.5 }}>
              <Avatar player={picked} size="md" crown={false} dimOffline={false} />
            </motion.span>
          )
        }
      >
        <p className={TITLE}>{t('reveal.me.wrongTitle', { name: picked?.name ?? '???' })}</p>
        <p className="mt-0.5 text-sm font-bold text-ink-soft">{tpick('reveal.me.wrongSub', index)}</p>
      </Row>
    );
  }

  if (result === 'proud' || result === 'offended') {
    const group = CAPTION_GROUP[kind];
    const mood = result === 'proud' ? tpick(`reveal.me.mineProud.${group}`, index) : tpick(`reveal.me.mineOffended.${group}`, index);
    return (
      <Row result={result}>
        <p className={TITLE}>{t(`reveal.me.mineTitle.${kind}`)}</p>
        {total > 0 ? (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm font-extrabold">
            <Stamp glow={false} size="md" ariaLabel={`${correct}/${total}`}>{`${pad(correct)}/${pad(total)}`}</Stamp>
            <span>{t(`reveal.me.mineCount.${kind}`)}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-sm font-extrabold">{t(`reveal.me.mineNoVotes.${kind}`)}</p>
        )}
        <p className="mt-0.5 text-sm font-bold text-ink-soft">{mood}</p>
      </Row>
    );
  }

  return (
    <Row result={result} glass>
      <p className={TITLE}>{t('reveal.me.noneTitle')}</p>
      <p className="mt-0.5 text-sm font-bold text-grape-200">{t('reveal.me.noneSub')}</p>
    </Row>
  );
}

/** Compact verdict slapped on the photo corner (phones), so it is visible without scrolling. */
export function PersonalBadge({ result }: { result: PersonalResult }) {
  const v = VERDICT[result];
  return (
    <motion.span
      className="inline-flex"
      initial={{ scale: 0, rotate: 40 }}
      animate={{ scale: 1, rotate: -10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 13, delay: 0.75 }}
      aria-hidden
    >
      <IconBadge name={result === 'right' ? 'check' : v.icon} tone={v.tone} size="md" />
    </motion.span>
  );
}
