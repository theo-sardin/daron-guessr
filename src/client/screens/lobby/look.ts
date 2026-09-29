import type { Theme } from '../../../shared/protocol';
import { THEME_TONE } from '../../components/ThemeArt';

const TONE_BG = { sun: 'bg-sun', mint: 'bg-mint', tangerine: 'bg-tangerine', lilac: 'bg-lilac', sky: 'bg-sky' } as const;

/** Background of the theme banner / selected theme tile: the theme's accent (ink text on all of them). */
export const themeBg = (theme: Theme) => TONE_BG[THEME_TONE[theme]];

/** DOM id of the theme picker in the settings card (the banner's "Change" button scrolls to it). */
export const THEME_PICKER_ID = 'lobby-theme-picker';

/**
 * @deprecated Kept for screens outside the lobby that still import it (home/ModeStep). Use `themeBg`.
 */
export const THEME_BG: Record<Theme, string> = {
  parents: themeBg('parents'),
  family: themeBg('family'),
  childhood: themeBg('childhood'),
  pick: themeBg('pick'),
  mix: themeBg('mix'),
};

/** @deprecated Only for theme emojis, which are going away. Kept for home/ModeStep until it migrates. */
export function glyphCount(text: string): number {
  try {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;
  } catch {
    return Array.from(text).length;
  }
}
