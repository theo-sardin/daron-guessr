import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { POINTS_PER_CORRECT, type PhotoKind, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { MarkerUnderline } from '../../components/Marker';
import { NotebookCard, PostIt } from '../../components/Paper';
import { RubberStamp } from '../../components/RubberStamp';
import { StarBurst } from '../../components/StarBurst';
import { useI18n } from '../../i18n';
import type { PersonalResult } from './effects';
import { CAPTION_GROUP } from './kinds';

/** The caption of the result, handwritten on a torn notebook page; the owner's name underlined in red. */
export function Caption({ text, owner }: { text: string; owner: string }) {
  const at = owner ? text.indexOf(owner) : -1;
  return (
    <NotebookCard torn="lb" tape="yellow" tilt={-1.2} leading={27} margin={22} slap={0.45} wrapperClassName="mx-1" className="pr-4 pb-2">
      <p className="text-pen text-[23px] leading-[27px] md:text-[25px]">
        {at < 0 ? (
          text
        ) : (
          <>
            {text.slice(0, at)}
            <MarkerUnderline delay={1.1} className="text-red-ink">
              {owner}
            </MarkerUnderline>
            {text.slice(at + owner.length)}
          </>
        )}
      </p>
    </NotebookCard>
  );
}

const TITLE = 'font-display text-[1.5rem] leading-[1.02] tracking-[-0.01em] break-words';

/** The viewer's own verdict for this photo, on a post-it, once the owner is revealed. */
export function Feedback({
  result,
  kind,
  index,
  picked,
  correct,
  total,
  points,
}: {
  result: PersonalResult;
  kind: PhotoKind;
  index: number;
  /** The candidate the viewer voted for (wrong answers). */
  picked: PublicPlayer | null;
  correct: number;
  total: number;
  /** Points earned on this photo (right answers: 100 + speed bonus). */
  points: number;
}) {
  const { t, tpick } = useI18n();

  if (result === 'right') {
    const bonus = Math.max(0, points - POINTS_PER_CORRECT);
    return (
      <Note color="mint" aside={<PointsBurst points={points} />}>
        <p className={TITLE}>{tpick('reveal.me.rightTitle', index)}</p>
        <p className="text-pen mt-0.5 text-[20px] leading-tight">
          {bonus > 0 ? t('reveal.me.bonus', { base: POINTS_PER_CORRECT, bonus }) : t('reveal.me.rightSub')}
        </p>
      </Note>
    );
  }

  if (result === 'wrong') {
    return (
      <Note
        color="pink"
        aside={
          picked && (
            <motion.span className="shrink-0" animate={{ rotate: [0, -12, 12, -8, 0] }} transition={{ delay: 1, duration: 0.5 }}>
              <Avatar player={picked} size="md" crown={false} dimOffline={false} tilt={6} selfie />
            </motion.span>
          )
        }
      >
        <p className={TITLE}>{t('reveal.me.wrongTitle', { name: picked?.name ?? '???' })}</p>
        <p className="text-pen mt-0.5 text-[20px] leading-tight">{tpick('reveal.me.wrongSub', index)}</p>
      </Note>
    );
  }

  if (result === 'proud' || result === 'offended') {
    const group = CAPTION_GROUP[kind];
    const mood = result === 'proud' ? tpick(`reveal.me.mineProud.${group}`, index) : tpick(`reveal.me.mineOffended.${group}`, index);
    return (
      <Note color={result === 'proud' ? 'yellow' : 'sky'}>
        <p className={TITLE}>{t(`reveal.me.mineTitle.${kind}`)}</p>
        {total > 0 ? (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-bold">
            <span className="font-display text-[1.6rem] leading-none">{`${correct}/${total}`}</span>
            <span>{t(`reveal.me.mineCount.${kind}`)}</span>
          </p>
        ) : (
          <p className="mt-0.5 font-bold">{t(`reveal.me.mineNoVotes.${kind}`)}</p>
        )}
        <p className="text-pen mt-0.5 text-[20px] leading-tight">{mood}</p>
      </Note>
    );
  }

  return (
    <Note color="lilac">
      <p className={TITLE}>{t('reveal.me.noneTitle')}</p>
      <p className="text-pen mt-0.5 text-[20px] leading-tight">{t('reveal.me.noneSub')}</p>
    </Note>
  );
}

function Note({ children, aside, color }: { children: ReactNode; aside?: ReactNode; color: 'yellow' | 'pink' | 'mint' | 'sky' | 'lilac' }) {
  return (
    <PostIt color={color} tilt={1.2} slap={0.7} tape wrapperClassName="mx-2" className="flex items-center gap-3 px-4 pt-3.5 pb-3">
      <div className="min-w-0 flex-1">{children}</div>
      {aside}
    </PostIt>
  );
}

function PointsBurst({ points, size = 84 }: { points: number; size?: number }) {
  return (
    <StarBurst tone="yellow" size={size} tilt={-8} animate={1} className="-my-3 -mr-2">
      <span className="font-display text-[22px] leading-none">+{points}</span>
    </StarBurst>
  );
}

/**
 * Compact verdict slapped on the photo corner, so it is visible without scrolling on a phone:
 * the points earned, or a blue "MISSED" stamp.
 */
export function PersonalBadge({ result, points, live }: { result: PersonalResult; points: number; live: boolean }) {
  const { t } = useI18n();
  if (result === 'right') {
    return (
      <StarBurst tone="yellow" size={78} tilt={-10} animate={0.75}>
        <span className="font-display text-[21px] leading-none">+{points}</span>
      </StarBurst>
    );
  }
  if (result === 'wrong') {
    return (
      <RubberStamp tone="blue" size="sm" tilt={-9} backing animate={0.8} sound={live} className="ml-1 mb-2">
        {t('reveal.me.missed')}
      </RubberStamp>
    );
  }
  return null;
}
