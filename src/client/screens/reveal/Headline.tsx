import { AnimatePresence, motion } from 'motion/react';
import type { ParentKind, PublicPlayer } from '../../../shared/protocol';
import { useI18n } from '../../i18n';
import type { Stage } from './timeline';

const SLOT = '\u0001';

/**
 * The big line above the photo: the question → "And it's…" during the drum roll → the
 * owner's name ("Paul's mom") once revealed, followed by a caption fitting the result.
 */
export function Headline({
  stage,
  kind,
  index,
  owner,
  caption,
}: {
  stage: Stage;
  kind: ParentKind;
  index: number;
  /** Only set once the owner is revealed. */
  owner: PublicPlayer | null;
  caption: string | null;
}) {
  const { t, tpick } = useI18n();
  const mode = owner ? 'owner' : stage === 'drumroll' ? 'drumroll' : 'question';
  const [before, after] = owner ? t(`common.possessive.${kind}`, { name: SLOT }).split(SLOT) : ['', ''];

  return (
    <div className="mb-4 text-center">
      <div className="flex min-h-[3.25rem] items-center justify-center sm:min-h-[4rem]">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'question' && (
            <motion.h1
              key="question"
              className="text-outline font-display text-[2rem] leading-[1.1] text-cream sm:text-5xl"
              initial={{ scale: 0.7, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              {t(`common.whose.${kind}`)} <span className="inline-block">{t(`common.kindEmoji.${kind}`)}</span>
            </motion.h1>
          )}
          {mode === 'drumroll' && (
            <motion.h1
              key="drumroll"
              className="text-outline font-display text-[2.1rem] leading-[1.1] text-sun sm:text-6xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.06, 1], opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ scale: { duration: 0.5, repeat: Infinity }, opacity: { duration: 0.2 } }}
            >
              <motion.span
                className="mr-2 inline-block"
                animate={{ rotate: [-14, 14], y: [0, -4, 0] }}
                transition={{ duration: 0.18, repeat: Infinity, repeatType: 'mirror' }}
                aria-hidden
              >
                🥁
              </motion.span>
              {tpick('reveal.andItIs', index)}
            </motion.h1>
          )}
          {mode === 'owner' && owner && (
            <motion.h1
              key="owner"
              className="text-outline font-display text-[2.1rem] leading-[1.1] break-words text-cream sm:text-5xl"
              initial={{ scale: 2.2, opacity: 0, rotate: 6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            >
              {before}
              <span style={{ color: owner.color }}>{owner.name}</span>
              {after} {t(`common.kindEmoji.${kind}`)}
            </motion.h1>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {caption && (
          <motion.p
            key="caption"
            className="mx-auto mt-2 max-w-md text-base leading-snug font-extrabold text-grape-200 sm:text-lg"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 22 }}
          >
            {caption}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
