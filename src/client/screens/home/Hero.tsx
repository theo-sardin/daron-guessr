import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { THEMES } from '../../../shared/protocol';
import { Logo } from '../../components/Logo';
import { Annotation, Highlight } from '../../components/Marker';
import { KraftCard, NotebookCard, PostIt } from '../../components/Paper';
import { Polaroid } from '../../components/Polaroid';
import { StarBurst } from '../../components/StarBurst';
import type { TapeTone } from '../../components/Tape';
import { PaperStrip } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn, vibrate } from '../../lib/util';
import { HERO_PHOTOS } from './heroPhotos';

interface PrintSpec {
  src: string;
  /** Position + width classes inside the collage. */
  className: string;
  tilt: number;
  tape: TapeTone;
  delay: number;
}

/** The three family-album prints of the collage: baby (left), mom (middle, behind), dad (right). */
const PRINTS: PrintSpec[] = [
  { src: HERO_PHOTOS.baby, className: '-left-1 top-[1.9rem] z-[2] w-[32%]', tilt: -9, tape: 'cream', delay: 0.1 },
  { src: HERO_PHOTOS.mom, className: 'left-[33.5%] top-2.5 z-[1] w-[33%]', tilt: 2.5, tape: 'yellow', delay: 0.2 },
  { src: HERO_PHOTOS.dad, className: '-right-1 top-[2.1rem] z-[2] w-[31%]', tilt: 8, tape: 'cream', delay: 0.3 },
];

/**
 * One print of the collage. Tapping it teases ("Nice try") instead of revealing anything: the
 * whole game in a nutshell.
 */
function MysteryPrint({ spec, index }: { spec: PrintSpec; index: number }) {
  const { t, tpick } = useI18n();
  const reduce = useReducedMotion();
  const [pokes, setPokes] = useState(0);
  const [teasing, setTeasing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const poke = () => {
    sfx.play('pop');
    vibrate(10);
    setPokes((n) => n + 1);
    setTeasing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTeasing(false), 1400);
  };

  return (
    <motion.div
      className={cn('absolute', spec.className)}
      initial={reduce ? false : { opacity: 0, scale: 1.4, rotate: spec.tilt * 3, y: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: spec.tilt, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20, delay: spec.delay }}
    >
      <motion.button
        type="button"
        onClick={poke}
        aria-label={t('home.hero.mysteryLabel')}
        className="block w-full"
        whileHover={{ scale: 1.05, rotate: -spec.tilt / 3 }}
        whileTap={{ scale: 0.94 }}
        // A different keyframe list on every poke, so the wiggle replays (focus is kept).
        animate={pokes > 0 ? { rotate: pokes % 2 ? [0, -6, 5, -3, 0] : [0, 6, -5, 3, 0] } : undefined}
        transition={{ duration: 0.45 }}
      >
        <Polaroid
          src={spec.src}
          tape={spec.tape}
          className="block w-full p-[7px]! pb-1!"
          captionClassName="text-[1.05rem] min-[375px]:text-[1.15rem] whitespace-nowrap"
          caption={tpick('home.hero.captions', index)}
        />
      </motion.button>
      <AnimatePresence>
        {teasing && (
          <motion.span
            key={pokes}
            className="pointer-events-none absolute top-[62%] left-1/2 z-20 rounded-[3px] bg-yellow px-2.5 py-1 font-display text-sm whitespace-nowrap text-ink shadow-paper-sm"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, scale: 0.4, rotate: -spec.tilt }}
            animate={{ opacity: 1, scale: 1, rotate: -spec.tilt / 2 - 4 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            aria-hidden
          >
            {tpick('home.hero.peekTease', index + pokes)}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Masthead, the polaroid collage on its torn halftone strip, the cut-out logo and the tagline. */
export function Hero() {
  const t = useI18n().t;
  return (
    <section className="relative mx-auto w-full max-w-md">
      {/* The zine's masthead (leaves room for the star burst on the right). */}
      <p className="mr-[5.5rem] flex items-baseline gap-2 border-t-[2.5px] border-b border-ink pt-1.5 pb-1 whitespace-nowrap">
        <span className="font-wide text-[0.7rem] tracking-[0.06em]">{t('home.hero.issue')}</span>
        <span className="truncate font-[family-name:var(--font-type)] text-[0.72rem]">{t('home.hero.masthead')}</span>
      </p>
      <StarBurst tone="yellow" size={84} tilt={12} animate={0.55} className="absolute! -top-3 -right-1 z-[9] sm:right-1">
        <span className="text-[1.3rem] leading-[0.9]">{t('home.hero.burstTop')}</span>
        <span className="mt-0.5 text-[0.62rem] tracking-[0.02em]">{t('home.hero.burstBottom')}</span>
      </StarBurst>

      <div className="relative h-[13.5rem] min-[375px]:h-[14.5rem] sm:h-[16rem]">
        <PaperStrip tone="blue" tilt={-5} seed="home-hero" className="-inset-x-8 top-[3.4rem] h-[9.5rem] sm:h-[10.5rem]" />
        {PRINTS.map((p, i) => (
          <MysteryPrint key={i} spec={p} index={i} />
        ))}
        <Annotation font="marker" rotate={-8} size={17} delay={0.8} className="absolute top-0 left-2 z-[9] whitespace-nowrap">
          {t('home.hero.note')}
        </Annotation>
      </div>

      <div className="relative z-[8] -mt-14 flex justify-center min-[375px]:-mt-12">
        <Logo size="lg" className="max-[374px]:text-[56px]" />
      </div>

      <motion.div className="mt-3 text-center leading-none" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <p className="text-[1.03rem] font-semibold tracking-[-0.005em] text-ink-soft">{t('home.hero.taglineLead')}</p>
        <p className="mt-1.5 text-[1.55rem] font-black tracking-[-0.015em] text-balance min-[375px]:text-[1.7rem]" style={{ fontStretch: '112%' }}>
          {t('home.hero.taglineStart')} <Highlight delay={0.7}>{t('home.hero.taglineHighlight')}</Highlight>
        </p>
      </motion.div>
    </section>
  );
}

const STEPS = [
  { title: 'home.how.step1', note: 'home.how.step1Note', num: 'text-red', tilt: -2.4, y: 0 },
  { title: 'home.how.step2', note: 'home.how.step2Note', num: 'text-ink', tilt: 1.6, y: 4 },
  { title: 'home.how.step3', note: 'home.how.step3Note', num: 'text-blue', tilt: -1.2, y: 0 },
] as const;

/** The three steps as scraps: a notebook page, a piece of kraft and a post-it. */
export function HowItWorks({ className }: { className?: string }) {
  const t = useI18n().t;
  return (
    <section className={cn('mx-auto w-full max-w-md', className)} aria-label={t('home.how.title')}>
      <ol className="grid grid-cols-3 gap-2 px-0.5 sm:gap-3">
        {STEPS.map((s, i) => {
          const body = (
            <>
              <span className={cn('font-num block text-[2.5rem]', s.num)} aria-hidden>
                {i + 1}
              </span>
              <span className="mt-auto block text-[0.85rem] leading-[1.05] font-extrabold tracking-[-0.015em] text-ink min-[375px]:text-[0.92rem]">{t(s.title)}</span>
              <span className="text-pen mt-1 block text-[0.95rem] leading-none">{t(s.note)}</span>
            </>
          );
          const common = { tilt: s.tilt, slap: 0.5 + i * 0.12, className: 'flex h-[7.4rem] flex-col', tape: true as const };
          return (
            <li key={s.title} style={{ translate: `0 ${s.y}px` }} className="min-w-0">
              <span className="sr-only">{i + 1}. </span>
              {i === 0 ? (
                <NotebookCard {...common} margin={12} className={cn(common.className, 'pt-2.5 pr-2 pb-2.5')}>
                  {body}
                </NotebookCard>
              ) : i === 1 ? (
                <KraftCard {...common} className={cn(common.className, 'px-2.5 pt-2.5 pb-2.5')}>
                  {body}
                </KraftCard>
              ) : (
                <PostIt {...common} className={cn(common.className, 'px-2.5 pt-2.5 pb-2.5')}>
                  {body}
                </PostIt>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center">
        <Annotation font="pen" rotate={-1.5} size={19} delay={1} className="text-balance">
          {t('home.themes.teaser', { n: THEMES.length })}
        </Annotation>
      </p>
    </section>
  );
}
