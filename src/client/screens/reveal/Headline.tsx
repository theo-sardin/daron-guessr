import { AnimatePresence, motion } from 'motion/react';
import type { PhotoKind, PublicPlayer } from '../../../shared/protocol';
import { useI18n } from '../../i18n';
import type { Stage } from './timeline';

const SLOT = '\u0001';

const TITLE = 'text-outline font-display leading-[1.02] tracking-[-0.02em] [font-stretch:80%]';

/**
 * The big line above the photo: the question → "And it's…" under the darkroom safelight
 * during the drum roll → the owner's name ("Paul's mom") once revealed, followed by a
 * handwritten caption fitting the result.
 */
export function Headline({
  stage,
  kind,
  index,
  owner,
  caption,
}: {
  stage: Stage;
  kind: PhotoKind;
  index: number;
  /** Only set once the owner is revealed. */
  owner: PublicPlayer | null;
  caption: string | null;
}) {
  const { t, tpick } = useI18n();
  const mode = owner ? 'owner' : stage === 'drumroll' ? 'drumroll' : 'question';
  const [before, after] = owner ? t(`common.possessive.${kind}`, { name: SLOT }).split(SLOT) : ['', ''];

  return (
    <div className="relative z-[31] mb-4 text-center">
      <div className="flex min-h-[3.25rem] items-center justify-center sm:min-h-[4rem]">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'question' && (
            <motion.h1
              key="question"
              className={`${TITLE} text-[2.1rem] text-cream sm:text-5xl`}
              initial={{ scale: 0.7, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              {t(`common.whose.${kind}`)}
            </motion.h1>
          )}
          {mode === 'drumroll' && (
            <motion.h1
              key="drumroll"
              className={`${TITLE} flex items-center gap-3 text-[2.2rem] text-cream sm:text-6xl`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ scale: { duration: 0.5, repeat: Infinity }, opacity: { duration: 0.2 } }}
            >
              <SafelightLamp />
              {tpick('reveal.andItIs', index)}
            </motion.h1>
          )}
          {mode === 'owner' && owner && (
            <motion.h1
              key="owner"
              className={`${TITLE} text-[2.3rem] break-words text-cream sm:text-6xl`}
              initial={{ scale: 2.2, opacity: 0, rotate: 6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            >
              {before}
              <span style={{ color: owner.color }}>{owner.name}</span>
              {after}
            </motion.h1>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {caption && (
          <motion.p
            key="caption"
            className="text-hand mx-auto mt-1.5 max-w-md text-[1.6rem] leading-[1.05] text-balance text-grape-200 sm:text-3xl"
            initial={{ opacity: 0, y: 12, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 22 }}
          >
            {caption}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The darkroom's red safelight: a lamp that glows while the print develops. */
function SafelightLamp() {
  return (
    <motion.span
      className="relative inline-block size-[0.5em] shrink-0 rounded-full border-[3px] border-ink bg-safelight"
      animate={{ opacity: [1, 0.55, 1], boxShadow: ['0 0 18px 4px rgb(255 59 59 / 0.75)', '0 0 6px 1px rgb(255 59 59 / 0.4)', '0 0 18px 4px rgb(255 59 59 / 0.75)'] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    />
  );
}
