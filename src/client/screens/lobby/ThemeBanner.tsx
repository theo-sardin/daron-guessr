import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { Theme } from '../../../shared/protocol';
import { Icon } from '../../components/Icon';
import { Paper } from '../../components/Paper';
import { ThemeArt } from '../../components/ThemeArt';
import { PaperStrip } from '../../components/TornPaper';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { THEME_PICKER_ID, themeStrip } from './look';

/**
 * "This game: Mini me — bring 1 photo of YOU as a kid". Shown to everyone at the top of the
 * lobby, since the theme decides what each player has to upload: a torn sheet taped over a
 * halftone strip in the theme's color, the theme's collage on the left, the ask in ballpoint.
 * The host gets a shortcut to the theme picker.
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
  // No slap on the first render (the lobby card entrance already animates it).
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
    <div className="relative mx-auto mb-8 max-w-3xl pt-2">
      <PaperStrip tone={themeStrip(theme)} tilt={-2.5} seed={theme} className="absolute -inset-x-3 top-8 bottom-3 sm:-inset-x-8" />
      {/* Keyed on the theme: a switch slaps the new banner on (no exit, so there is never a gap). */}
      <motion.section
        key={theme}
        aria-live="polite"
        initial={first.current ? false : { scale: 0.85, rotate: -5, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        className="relative"
      >
        <Paper surface="grain" torn="b" tilt={-0.8} tape seed={`banner-${theme}`} className="flex items-center gap-3 p-3 pr-3.5 pb-4 sm:gap-5 sm:p-4 sm:pb-5">
          <span className="shrink-0 -rotate-3" aria-hidden>
            <ThemeArt theme={theme} className="size-22 sm:size-28" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="label-type pt-1 text-ink-soft">{t('lobby.banner.label')}</p>
              {isHost && (
                <motion.button
                  type="button"
                  onClick={goToPicker}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t('lobby.banner.changeAria')}
                  // 44px tall hit area around the handwritten link.
                  className="group -my-2 -mr-1 flex h-11 shrink-0 items-center gap-1 px-1.5 text-blue"
                >
                  <Icon name="edit" className="size-4" />
                  <span className="text-hand text-[1.2rem] leading-none underline decoration-2 underline-offset-4 group-hover:decoration-wavy">
                    {t('lobby.banner.change')}
                  </span>
                </motion.button>
              )}
            </div>
            <h2 className="mt-0.5 font-heavy text-[1.6rem] leading-[0.92] tracking-[-0.02em] uppercase sm:text-[2.2rem]">
              {t(`common.theme.${theme}.name`)}
            </h2>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`${photosPerPlayer}`}
                className="text-pen mt-1.5 text-[1.2rem] leading-[1.05] sm:text-[1.4rem]"
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
                  className="mt-2 inline-flex items-center gap-1.5 bg-ink px-2 py-1 font-type text-[0.72rem] leading-none tracking-[0.04em] text-sheet uppercase"
                  style={{ rotate: '-1.5deg' }}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Icon name="eye" className="size-3.5 blur-[0.6px]" />
                  {t('lobby.banner.blurTag')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Paper>
      </motion.section>
    </div>
  );
}
