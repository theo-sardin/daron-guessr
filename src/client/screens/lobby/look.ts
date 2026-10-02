import type { PhotoKind, Theme } from '../../../shared/protocol';

/** Color family of a photo kind (chips, empty slots, picker). */
type Tone = 'sky' | 'pink' | 'mint' | 'sun' | 'lilac' | 'tangerine';

const KIND_TONE: Record<PhotoKind, Tone> = {
  daron: 'sky',
  daronne: 'pink',
  brother: 'mint',
  sister: 'lilac',
  grandpa: 'sun',
  grandma: 'tangerine',
  friend: 'mint',
  partner: 'pink',
  pet: 'sun',
  kid: 'tangerine',
  pick: 'lilac',
  roll: 'sky',
  crush: 'pink',
  me: 'tangerine',
  hand: 'sun',
  foot: 'mint',
  ear: 'pink',
  eye: 'sky',
  nose: 'tangerine',
  smile: 'sun',
  knee: 'lilac',
  elbow: 'mint',
  navel: 'pink',
  hair: 'lilac',
};

const CHIP: Record<Tone, string> = {
  sky: 'bg-sky text-ink',
  pink: 'bg-pink text-white',
  mint: 'bg-mint text-ink',
  sun: 'bg-sun text-ink',
  lilac: 'bg-lilac text-ink',
  tangerine: 'bg-tangerine text-ink',
};

const EMPTY: Record<Tone, string> = {
  sky: 'border-sky-dark bg-sky/15 hover:bg-sky/25',
  pink: 'border-pink-dark bg-pink/10 hover:bg-pink/20',
  mint: 'border-mint-dark bg-mint/15 hover:bg-mint/25',
  sun: 'border-sun-dark bg-sun/20 hover:bg-sun/30',
  lilac: 'border-lilac bg-lilac/20 hover:bg-lilac/30',
  tangerine: 'border-tangerine bg-tangerine/15 hover:bg-tangerine/25',
};

/** Solid chip colors for a kind. */
export const kindChip = (kind: PhotoKind) => CHIP[KIND_TONE[kind]];
/** Dashed empty-slot colors for a kind. */
export const kindEmpty = (kind: PhotoKind) => EMPTY[KIND_TONE[kind]];

/** Background of the theme banner / selected theme sticker (ink text on all of them). */
export const THEME_BG: Record<Theme, string> = {
  parents: 'bg-sun',
  family: 'bg-mint',
  childhood: 'bg-tangerine',
  pick: 'bg-lilac',
  roll: 'bg-[#2ec4b6]',
  crush: 'bg-pink',
  whois: 'bg-[#5e8bff]',
  body: 'bg-[#ffb86b]',
  mix: 'bg-sky',
};

/** Number of user-perceived characters (a theme emoji can be one or two glyphs). */
export function glyphCount(text: string): number {
  try {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;
  } catch {
    return Array.from(text).length;
  }
}

/** DOM id of the theme picker in the settings card (the banner's "Change" button scrolls to it). */
export const THEME_PICKER_ID = 'lobby-theme-picker';
