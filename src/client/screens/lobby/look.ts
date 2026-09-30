import type { Theme } from '../../../shared/protocol';
import { THEME_TONE } from '../../components/ThemeArt';

/** The halftone strip glued behind the theme banner, in the theme's accent family. */
const STRIP = { sun: 'yellow', mint: 'mint', tangerine: 'red', lilac: 'pink', sky: 'blue' } as const;
export const themeStrip = (theme: Theme) => STRIP[THEME_TONE[theme]];

/** DOM id of the theme picker in the settings card (the banner's "Change" button scrolls to it). */
export const THEME_PICKER_ID = 'lobby-theme-picker';

/** Deterministic little tilt (degrees) for a paper piece, from any string. */
export function tiltFor(key: string, range = 2.4): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 2 * range;
}
