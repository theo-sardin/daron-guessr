import type { Theme } from '../../../shared/protocol';
import { THEME_TONE } from '../../components/ThemeArt';

const TONE_BG = { sun: 'bg-sun', mint: 'bg-mint', tangerine: 'bg-tangerine', lilac: 'bg-lilac', sky: 'bg-sky' } as const;

/** Background of the theme banner / selected theme tile: the theme's accent (ink text on all of them). */
export const themeBg = (theme: Theme) => TONE_BG[THEME_TONE[theme]];

/** DOM id of the theme picker in the settings card (the banner's "Change" button scrolls to it). */
export const THEME_PICKER_ID = 'lobby-theme-picker';
