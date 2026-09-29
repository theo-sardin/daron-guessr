import type { PhotoKind } from '../../../shared/protocol';

/**
 * How the reveal copy talks about a photo's subject. Captions and the owner's mood lines are
 * written once per group, and the exact noun ("your sister", "le papi de Paul") is interpolated:
 * - `relM` / `relF`: male / female relatives (EN him/her, FR agreement: reconnu / reconnue).
 * - `other`: friend, partner, pet — no family wording, and FR phrasings that need no agreement.
 * - `kid`: the owner themself as a child. `pick`: a picture the owner chose.
 */
export type CaptionGroup = 'relM' | 'relF' | 'other' | 'kid' | 'pick';

export const CAPTION_GROUP: Record<PhotoKind, CaptionGroup> = {
  daron: 'relM',
  brother: 'relM',
  grandpa: 'relM',
  daronne: 'relF',
  sister: 'relF',
  grandma: 'relF',
  friend: 'other',
  partner: 'other',
  pet: 'other',
  kid: 'kid',
  pick: 'pick',
};
