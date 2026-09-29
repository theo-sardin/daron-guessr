import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { Theme } from '../../../shared/protocol';
import { Icon } from '../../components/Icon';
import { ThemeArt } from '../../components/ThemeArt';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn } from '../../lib/util';
import { THEME_PICKER_ID, themeBg } from './look';

/**
 * "This game: Mini me — bring 1 photo of YOU as a kid". Shown to everyone at the top of the
 * lobby, since the theme decides what each player has to upload. The host gets a shortcut to
 * the theme picker.
 */
export function ThemeBanner({ theme, photosPerPlayer, isHost }: { theme: Theme; photosPerPlayer: number; isHost: boolean }) {
  const t = useT();
  // No pop on the first render (the lobby card entrance already animates it).
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
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
          themeBg(theme),
        )}
      >
        {/* The theme's illustration pinned on a cream mat, like a contact sheet swatch. */}
        <motion.span
          className="flex size-18 shrink-0 items-center justify-center rounded-2xl border-3 border-ink bg-cream shadow-pop-sm sm:size-22"
          animate={{ rotate: [-4, 3, -4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          <ThemeArt theme={theme} className="size-14 sm:size-17" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="label-mono text-ink/70">{t('lobby.banner.label')}</p>
            {isHost && (
              <motion.button
                type="button"
                onClick={goToPicker}
                whileTap={{ scale: 0.9 }}
                aria-label={t('lobby.banner.changeAria')}
                // 44px tall hit area around a 32px pill.
                className="group -my-1.5 -mr-1 flex h-11 shrink-0 items-center px-1"
              >
                <span className="flex h-8 items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-2.5 font-display text-xs shadow-pop-sm transition-colors group-hover:bg-white">
                  <Icon name="edit" className="size-3.5" />
                  {t('lobby.banner.change')}
                </span>
              </motion.button>
            )}
          </div>
          <h2 className="mt-0.5 font-display text-[1.75rem] leading-[0.95] tracking-[-0.02em] [font-stretch:78%] sm:text-4xl">
            {t(`common.theme.${theme}.name`)}
          </h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={photosPerPlayer}
              className="mt-1 text-sm leading-snug font-semibold text-ink/85 sm:text-base"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              {ask}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.section>
    </div>
  );
}
