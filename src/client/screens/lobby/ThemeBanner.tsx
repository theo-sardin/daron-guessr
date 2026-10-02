import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { Theme } from '../../../shared/protocol';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn } from '../../lib/util';
import { glyphCount, THEME_BG, THEME_PICKER_ID } from './look';

/**
 * "This game: 🧒 Mini me — bring 1 photo of YOU as a kid". Shown to everyone at the top of the
 * lobby, since the theme decides what each player has to upload. A "blurry + speed bonus" badge
 * says when the blur option is on. The host gets a shortcut to the theme picker.
 */
export function ThemeBanner({
  theme,
  photosPerPlayer,
  blur,
  isHost,
}: {
  theme: Theme;
  photosPerPlayer: number;
  blur: boolean;
  isHost: boolean;
}) {
  const t = useT();
  // No pop on the first render (the lobby card entrance already animates it).
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  const emoji = t(`common.theme.${theme}.emoji`);
  const ask = photosPerPlayer === 1 ? t(`lobby.banner.ask.${theme}.one`) : t(`lobby.banner.ask.${theme}.many`, { n: photosPerPlayer });

  const goToPicker = () => {
    sfx.play('click');
    const el = document.getElementById(THEME_PICKER_ID);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
  };

  return (
    <div className="mx-auto mb-5 max-w-3xl">
      {/* Keyed on the theme: a switch pops the new banner in (no exit, so there is never a gap). */}
      <motion.section
        key={theme}
        aria-live="polite"
        initial={first.current ? false : { scale: 0.85, rotate: -4 }}
        animate={{ scale: 1, rotate: -0.6 }}
        transition={{ type: 'spring', stiffness: 520, damping: 16 }}
        className={cn(
          'relative flex items-center gap-3 rounded-3xl border-3 border-ink p-3 text-ink shadow-pop sm:gap-4 sm:p-4',
          THEME_BG[theme],
        )}
      >
        <motion.span
          className={cn(
            'flex size-16 shrink-0 items-center justify-center rounded-2xl border-3 border-ink bg-white leading-none shadow-pop-sm sm:size-20',
            glyphCount(emoji) > 1 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl',
          )}
          animate={{ rotate: [-6, 4, -6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          {emoji}
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xs tracking-[0.18em] text-ink/70 uppercase">{t('lobby.banner.label')}</p>
            {isHost && (
              <motion.button
                type="button"
                onClick={goToPicker}
                whileTap={{ scale: 0.9 }}
                aria-label={t('lobby.banner.changeAria')}
                className="-my-1 flex h-8 shrink-0 items-center gap-1 rounded-full border-2 border-ink bg-white px-2.5 font-display text-xs shadow-pop-sm"
              >
                <span aria-hidden>✏️</span>
                {t('lobby.banner.change')}
              </motion.button>
            )}
          </div>
          <h2 className="font-display text-2xl leading-tight sm:text-3xl">{t(`common.theme.${theme}.name`)}</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={photosPerPlayer}
              className="mt-0.5 text-sm leading-snug font-bold text-ink/85 sm:text-base"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              {ask}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {blur && (
              <motion.span
                key="blur"
                className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 font-display text-xs leading-5 text-sun shadow-pop-sm sm:text-sm"
                initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: -2, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16 }}
              >
                <span className="blur-[1px]" aria-hidden>
                  👀
                </span>
                <span className="truncate">{t('lobby.banner.blurTag')}</span>
                <span aria-hidden>⚡</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </div>
  );
}
