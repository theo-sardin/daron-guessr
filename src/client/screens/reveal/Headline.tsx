import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { PhotoKind, PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { CutoutText } from '../../components/CutoutText';
import { MarkerUnderline } from '../../components/Marker';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import type { Stage } from './timeline';

/** Paper confetti scattered around the owner's name (static: the canvas confetti does the motion). */
const BITS: Array<CSSProperties & { sq?: boolean }> = [
  { background: 'var(--color-red)', width: 14, height: 7, left: '3%', top: 8, rotate: '34deg', sq: true },
  { background: 'var(--color-blue)', width: 9, height: 9, left: '9%', top: 58 },
  { background: 'var(--color-yellow)', width: 7, height: 7, left: '2%', top: 92 },
  { background: 'var(--color-mint)', width: 18, height: 5, left: '20%', top: 0, rotate: '9deg', sq: true },
  { background: 'var(--color-blue)', width: 18, height: 5, right: '4%', top: 30, rotate: '-25deg', sq: true },
  { background: 'var(--color-yellow)', width: 18, height: 5, right: '7%', top: 82, rotate: '-40deg', sq: true },
  { background: 'var(--color-pink)', width: 9, height: 9, right: '2%', top: 6 },
  { background: 'var(--color-ink)', width: 6, height: 6, right: '22%', top: 104 },
];

/**
 * The big line above the photo: the question → "And it's…" in cut-out letters during the drum
 * roll → once revealed, "THE MOM OF" in wide caps and the owner's name in ransom-note letters
 * with their avatar sticker slapped next to it (mockup B).
 */
export function Headline({ stage, kind, index, owner }: { stage: Stage; kind: PhotoKind; index: number; owner: PublicPlayer | null }) {
  const { t, tpick } = useI18n();
  const mode = owner ? 'owner' : stage === 'drumroll' ? 'drumroll' : 'question';

  return (
    <div className="relative z-[3] mb-1 text-center">
      <div className="flex min-h-[7.25rem] flex-col items-center justify-center md:min-h-[8.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'question' && (
            <motion.h1
              key="question"
              className="font-wide max-w-[22rem] text-[1.45rem] leading-[1.08] text-balance uppercase md:max-w-[30rem] md:text-[2rem]"
              initial={{ scale: 1.25, opacity: 0, rotate: -3 }}
              animate={{ scale: 1, opacity: 1, rotate: -1 }}
              exit={{ scale: 0.85, opacity: 0, y: -8, transition: { duration: 0.16 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            >
              <MarkerUnderline delay={0.35} seed={index}>
                {t(`common.whose.${kind}`)}
              </MarkerUnderline>
            </motion.h1>
          )}
          {mode === 'drumroll' && (
            <motion.div
              key="drumroll"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0, transition: { duration: 0.16 } }}
              transition={{ scale: { duration: 0.5, repeat: Infinity }, opacity: { duration: 0.15 } }}
            >
              <CutoutText as="h1" text={tpick('reveal.andItIs', index)} size={36} seed={index} animate stagger={0.05} />
            </motion.div>
          )}
          {mode === 'owner' && owner && (
            <motion.div key="owner" className="relative w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }}>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1 h-28">
                {BITS.map(({ sq, ...c }, i) => (
                  <motion.i
                    key={i}
                    className={cn('absolute block shadow-[0_1px_1px_rgb(0_0_0/0.15)]', sq ? 'rounded-[1px]' : 'rounded-full')}
                    style={c}
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.1 + i * 0.03 }}
                  />
                ))}
              </div>
              <h1 className="relative">
                <motion.span
                  className="font-wide block text-[1.3rem] leading-none tracking-[0.02em] uppercase md:text-[1.6rem]"
                  initial={{ y: -14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                >
                  {t(`reveal.kicker.${kind}`)}
                </motion.span>
                <span className="mt-1.5 flex items-center justify-center gap-2 px-1">
                  <CutoutText text={t('reveal.nameBang', { name: owner.name })} size={58} seed={owner.id} animate={0.08} stagger={0.05} className="min-w-0" />
                  <motion.span
                    className="shrink-0"
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 14, delay: 0.35 }}
                  >
                    <Avatar player={owner} size="lg" crown={false} dimOffline={false} selfie />
                  </motion.span>
                </span>
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
